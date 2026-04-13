import { useEffect, useRef, useState } from "react";
import { Eye, Loader2, MessageCircle, Send, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useGuestCollector } from "@/hooks/useGuestCollector";
import {
  addFreshCartItem,
  createFreshShare,
  fetchFreshComments,
  fetchFreshDiscover,
  postFreshComment,
  toggleFreshLike,
  type FreshComment,
  type FreshFeedItem,
} from "@/lib/freshApi";

function formatPrice(value: number) {
  return `${Number(value || 0).toFixed(3)} ETH`;
}

function formatCreatedAt(value?: string) {
  if (!value) return "Just now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Just now";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDeliveryMode(mode?: string) {
  switch (mode) {
    case "collect_onchain":
      return "Collect onchain";
    case "render_online":
      return "Render online";
    case "download_mobile":
      return "Download mobile";
    case "deliver_physical":
      return "Physical delivery";
    default:
      return "Digital delivery";
  }
}

export default function RebootDiscoverFeedPage() {
  const navigate = useNavigate();
  const collectorId = useGuestCollector();
  const [posts, setPosts] = useState<FreshFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, FreshComment[]>>({});
  const lastTapRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await fetchFreshDiscover(collectorId);
        if (!active) return;
        setPosts(payload.feed || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load discover feed.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [collectorId]);

  async function handlePrimaryAction(post: FreshFeedItem) {
    if (post.in_app_action === "view_in_app") {
      navigate(`/products/${encodeURIComponent(post.product_id)}`);
      return;
    }

    try {
      setBusyId(post.id);
      await addFreshCartItem(collectorId, post.product_id, 1);
      navigate("/checkout");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open buy flow.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLike(post: FreshFeedItem) {
    try {
      const next = await toggleFreshLike(post.post_id, collectorId);
      setPosts((current) =>
        current.map((entry) =>
          entry.post_id === post.post_id
            ? {
                ...entry,
                liked: next.liked,
                like_count: next.like_count,
              }
            : entry,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to like this post.");
    }
  }

  async function handleShare(post: FreshFeedItem) {
    try {
      setBusyId(post.id);
      const payload = await createFreshShare(post.post_id);
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: payload.share_message,
          url: payload.share_url,
        });
      } else {
        await navigator.clipboard.writeText(payload.share_url);
        toast.success("Share card link copied. Paste into Twitter or Telegram.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Share failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleComment(post: FreshFeedItem) {
    const isClosing = openCommentId === post.id;
    setOpenCommentId(isClosing ? null : post.id);
    if (isClosing || commentsByPost[post.post_id]) return;
    try {
      const payload = await fetchFreshComments(post.post_id);
      setCommentsByPost((current) => ({ ...current, [post.post_id]: payload.comments || [] }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load comments.");
    }
  }

  async function submitComment(post: FreshFeedItem) {
    const body = String(drafts[post.id] || "").trim();
    if (!body) {
      toast.error("Write a comment first.");
      return;
    }

    try {
      setBusyId(post.id);
      const payload = await postFreshComment(post.post_id, collectorId, body);
      setDrafts((current) => ({ ...current, [post.id]: "" }));
      setCommentsByPost((current) => ({
        ...current,
        [post.post_id]: [...(current[post.post_id] || []), payload.comment],
      }));
      setPosts((current) =>
        current.map((entry) =>
          entry.post_id === post.post_id
            ? { ...entry, comment_count: Number(entry.comment_count || 0) + 1 }
            : entry,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post comment.");
    } finally {
      setBusyId(null);
    }
  }

  function handleTouchTap(post: FreshFeedItem) {
    const now = Date.now();
    const last = lastTapRef.current[post.post_id] || 0;
    if (now - last < 280) {
      void handleLike(post);
    }
    lastTapRef.current[post.post_id] = now;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-3 py-6 md:px-0">
      {posts.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-600">
          No discover posts yet.
        </div>
      ) : (
        posts.map((post) => {
          const busy = busyId === post.id;
          const commentsOpen = openCommentId === post.id;
          const comments = commentsByPost[post.post_id] || [];
          const isViewAction = post.in_app_action === "view_in_app";
          const actionLabel = post.in_app_action_label || (isViewAction ? "View in app" : "Collect in app");

          return (
            <article key={post.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {post.creator_avatar_url ? (
                      <img src={post.creator_avatar_url} alt={post.creator_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
                        {post.creator_name?.slice(0, 1) || "C"}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{post.creator_name}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {post.product_type} | {formatDeliveryMode(post.delivery_mode)} | {formatCreatedAt(post.created_at)}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  {formatPrice(Number(post.price_eth || 0))}
                </span>
              </header>

              <button
                type="button"
                onDoubleClick={() => void handleLike(post)}
                onTouchEnd={() => handleTouchTap(post)}
                className="block w-full bg-slate-900 text-left"
              >
                {post.image_url ? (
                  <img src={post.image_url} alt={post.title} className="aspect-[4/5] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center text-sm text-white/65">No media preview</div>
                )}
              </button>

              <div className="space-y-3 px-4 py-4">
                <h2 className="text-xl font-bold text-slate-950">{post.title}</h2>
                <p className="text-sm leading-6 text-slate-700">{post.description || "Creator post ready for collector action."}</p>

                <div className="text-xs text-slate-500">
                  {post.like_count || 0} likes | {post.comment_count || 0} comments
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => void toggleComment(post)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Comment
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePrimaryAction(post)}
                    disabled={busy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isViewAction ? <Eye className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                    {busy ? (isViewAction ? "Opening..." : "Adding...") : actionLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShare(post)}
                    disabled={busy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Share
                  </button>
                </div>

                {commentsOpen ? (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="max-h-40 space-y-2 overflow-auto rounded-lg bg-white p-2">
                      {comments.length === 0 ? (
                        <p className="text-xs text-slate-500">No comments yet.</p>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="rounded-lg border border-slate-100 px-2 py-1.5">
                            <p className="text-[11px] font-semibold text-slate-700">{comment.collector_id}</p>
                            <p className="text-xs text-slate-600">{comment.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <textarea
                      value={drafts[post.id] || ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [post.id]: event.target.value,
                        }))
                      }
                      placeholder="Share your collector perspective..."
                      className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-slate-300"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenCommentId(null)}
                        disabled={busy}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitComment(post)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Post
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
