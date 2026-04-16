import { useEffect, useMemo, useState } from "react";
import { Eye, Gift, Heart, Loader2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { parseEther } from "viem";
import { toast } from "sonner";
import { useGuestCollector } from "@/hooks/useGuestCollector";
import { useWallet } from "@/hooks/useWallet";
import { useMintArtist } from "@/hooks/useContractsArtist";
import { ACTIVE_CHAIN } from "@/lib/wagmi";
import { collectFreshOnchain, fetchFreshHome, toggleFreshLike, type FreshFeedItem } from "@/lib/freshApi";

function formatPrice(value: number) {
  return `${Number(value || 0).toFixed(3)} ETH`;
}

export default function RebootHomePage() {
  const navigate = useNavigate();
  const collectorId = useGuestCollector();
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState<FreshFeedItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [collectingItem, setCollectingItem] = useState<FreshFeedItem | null>(null);

  const { isConnected, connectWallet, chain, requestActiveChainSwitch, isSwitchingNetwork } = useWallet();
  const {
    mint: mintArtist,
    isConfirming: isMintConfirming,
    isSuccess: isMintSuccess,
    error: mintError,
  } = useMintArtist();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await fetchFreshHome(collectorId);
        if (!active) return;
        setFeatured(payload.featured || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load showcase.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [collectorId]);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % featured.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [featured.length]);

  const activeItem = useMemo(() => featured[activeIndex] || null, [featured, activeIndex]);

  useEffect(() => {
    if (!isMintSuccess || !collectingItem) return;

    collectFreshOnchain(collectorId, collectingItem.product_id)
      .then(() => {
        toast.success("Onchain collect confirmed. The gated pass is in your collection.");
        navigate("/profile");
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to update collection.");
      })
      .finally(() => {
        setCollectingItem(null);
        setBusyId(null);
      });
  }, [collectorId, collectingItem, isMintSuccess, navigate]);

  useEffect(() => {
    if (!mintError) return;
    toast.error((mintError as Error).message || "Onchain collect failed.");
    setCollectingItem(null);
    setBusyId(null);
  }, [mintError]);

  async function handleLike(post: FreshFeedItem) {
    try {
      setBusyId(post.id);
      const next = await toggleFreshLike(post.post_id, collectorId);
      setFeatured((current) =>
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
      toast.error(error instanceof Error ? error.message : "Unable to update like.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOnchainCollect(post: FreshFeedItem) {
    if (!isConnected) {
      await connectWallet();
      return;
    }
    if (chain?.id !== ACTIVE_CHAIN.id) {
      try {
        await requestActiveChainSwitch(`Collecting onchain requires ${ACTIVE_CHAIN.name}.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Switch to ${ACTIVE_CHAIN.name} and try again.`);
      }
      return;
    }

    const dropId = post.onchain?.drop_id;
    const contractAddress = post.onchain?.contract_address;
    if (!dropId || !contractAddress) {
      toast.error("Onchain collect is not fully configured for this item yet.");
      return;
    }

    try {
      setBusyId(post.id);
      setCollectingItem(post);
      mintArtist(dropId, parseEther(String(post.price_eth || 0)), contractAddress);
      toast.loading("Submitting onchain collect...");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start onchain collect.");
      setBusyId(null);
      setCollectingItem(null);
    }
  }

  function openPrimaryAction(post: FreshFeedItem) {
    if (post.delivery_mode === "collect_onchain") {
      void handleOnchainCollect(post);
      return;
    }
    if (post.in_app_action === "view_in_app") {
      navigate(`/products/${encodeURIComponent(post.product_id)}`);
      return;
    }
    navigate(`/checkout?product=${encodeURIComponent(post.product_id)}`);
  }

  return (
    <div className="space-y-4 px-4 py-6 md:px-2">
      <section className="space-y-4">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-slate-200 bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : !activeItem ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
            No featured projects yet.
          </div>
        ) : (
          <div className="space-y-4">
            <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_50px_-28px_rgba(15,23,42,0.5)]">
              <div className="grid gap-0 md:gap-0 lg:grid-cols-[1.45fr_1fr]">
                <div className="relative min-h-[280px] bg-slate-900 md:min-h-[380px]">
                  {activeItem.image_url ? (
                    <img src={activeItem.image_url} alt={activeItem.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/70">Media preview unavailable</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>

                <div className="space-y-3 px-4 py-4 md:space-y-4 md:px-5 md:py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Deck Slide Showcase</p>
                  <h3 className="text-xl font-bold text-slate-950 md:text-2xl line-clamp-2">{activeItem.title}</h3>
                  <p className="text-xs leading-5 text-slate-600 md:text-sm md:leading-6 line-clamp-3">
                    {activeItem.description || "Creator-owned release ready for collector flow."}
                  </p>

                  <div className="rounded-2xl bg-slate-100 px-3 py-2 md:px-4 md:py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Price</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-950 md:text-base">{formatPrice(Number(activeItem.price_eth || 0))}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-slate-500 md:px-4 md:py-3 md:text-xs">
                    Payment: {activeItem.delivery_mode === "collect_onchain" ? "Onchain (Base Sepolia)" : "Offchain (Checkout)"}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/artists/${activeItem.creator_id}`)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-950 md:px-4 md:py-2 md:text-sm"
                  >
                    <User className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="truncate">{activeItem.creator_name || "Creator"}</span>
                  </button>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openPrimaryAction(activeItem)}
                      disabled={busyId === activeItem.id || isMintConfirming || isSwitchingNetwork}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70 md:gap-2 md:px-4 md:py-2 md:text-sm"
                    >
                      {activeItem.in_app_action === "view_in_app" ? <Eye className="h-3 w-3 md:h-4 md:w-4" /> : <Gift className="h-3 w-3 md:h-4 md:w-4" />}
                      <span className="hidden sm:inline">
                        {activeItem.delivery_mode === "collect_onchain"
                          ? busyId === activeItem.id
                            ? "Collecting..."
                            : "Collect onchain"
                          : activeItem.in_app_action_label || (activeItem.in_app_action === "view_in_app" ? "View in app" : "Collect in app")}
                      </span>
                      <span className="sm:hidden">
                        {activeItem.delivery_mode === "collect_onchain"
                          ? busyId === activeItem.id
                            ? "..."
                            : "Collect"
                          : activeItem.in_app_action === "view_in_app" ? "View" : "Get"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleLike(activeItem)}
                      disabled={busyId === activeItem.id}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition md:gap-2 md:px-4 md:py-2 md:text-sm ${
                        activeItem.liked
                          ? "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"
                      }`}
                    >
                      {busyId === activeItem.id ? <Loader2 className="h-3 w-3 animate-spin md:h-4 md:w-4" /> : <Heart className="h-3 w-3 md:h-4 md:w-4" />}
                      <span className="hidden sm:inline">Like {activeItem.like_count > 0 ? `(${activeItem.like_count})` : ""}</span>
                      <span className="sm:hidden">{activeItem.like_count > 0 ? activeItem.like_count : ""}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <div className="flex flex-wrap items-center gap-2">
              {featured.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition md:px-3 ${
                    index === activeIndex ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item.title.slice(0, 20)}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
