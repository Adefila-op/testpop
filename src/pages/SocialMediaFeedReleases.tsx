import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Music, Zap, User, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/lib/db';
import { CatalogItem, formatPrice, formatSupply } from '@/utils/catalogUtils';
import {
  SocialShareButton,
  FavoritesButton,
  SubscribeButton
} from '@/components/PersonalizationComponents';

interface SocialFeedPost extends CatalogItem {
  creator_name?: string;
  is_liked?: boolean;
  like_count?: number;
  is_verified?: boolean;
}

export function SocialMediaFeedReleases() {
  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [selectedPost, setSelectedPost] = useState<SocialFeedPost | null>(null);
  const [showComments, setShowComments] = useState(false);

  // Load posts
  useEffect(() => {
    const loadPosts = async () => {
      if (!hasMore || loading) return;

      setLoading(true);
      try {
        const { data, error, count } = await supabase
          .from('catalog_with_engagement')
          .select('*', { count: 'exact' })
          .in('item_type', ['release', 'product'])
          .order('created_at', { ascending: false })
          .range((page - 1) * 10, page * 10 - 1);

        if (error) throw error;

        setPosts((prev) => [...prev, ...(data || [])]);
        setHasMore((data?.length || 0) >= 10);
      } catch (error) {
        console.error('Failed to load posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [page]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div className="h-screen bg-black text-white overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gray-800 p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold">Creative Releases</h1>
          <p className="text-sm text-gray-400">Discover digital products & experiences</p>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-md mx-auto">
        {posts.map((post, idx) => (
          <SocialFeedCard
            key={`${post.id}-${idx}`}
            post={post}
            onComment={() => {
              setSelectedPost(post);
              setShowComments(true);
            }}
          />
        ))}
      </div>

      {/* Loading indicator */}
      <div ref={observerTarget} className="p-4 text-center">
        {loading && <p className="text-gray-400">Loading more...</p>}
      </div>

      {/* Comments Modal */}
      {showComments && selectedPost && (
        <CommentsSheet post={selectedPost} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}

interface SocialFeedCardProps {
  post: SocialFeedPost;
  onComment: () => void;
}

function SocialFeedCard({ post, onComment }: SocialFeedCardProps) {
  return (
    <div className="h-screen bg-black snap-start relative flex flex-col justify-end pb-20">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
      </div>

      {/* Top right menu */}
      <div className="absolute top-4 right-4 z-10">
        <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Right side actions */}
      <div className="absolute right-4 bottom-24 z-10 flex flex-col gap-4">
        {/* Favorites button */}
        <FavoritesButton item={post} />

        {/* Comments button */}
        <button
          onClick={onComment}
          className="flex flex-col items-center gap-1 p-3 rounded-full hover:bg-white/10 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-xs font-medium">{post.comment_count}</span>
        </button>

        {/* Share button */}
        <SocialShareButton item={post} />
      </div>

      {/* Bottom content */}
      <div className="relative z-20 space-y-3">
        {/* Creator info */}
        <div className="flex items-center gap-3 px-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {post.creator_wallet?.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-sm">
              {post.creator_wallet?.slice(0, 12)}...
            </p>
            <p className="text-xs text-gray-300">Creator</p>
          </div>
          <SubscribeButton 
            creator_id={post.creator_wallet}
            creator_wallet={post.creator_wallet}
            className="ml-auto"
          />
        </div>

        {/* Title and description */}
        <div className="px-4 space-y-2">
          <h2 className="text-lg font-bold leading-tight">{post.title}</h2>
          {post.description && (
            <p className="text-sm text-gray-200 line-clamp-2">{post.description}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {post.item_type === 'release' && (
              <span className="px-2 py-1 bg-purple-600/50 rounded-full text-xs font-medium">
                #CreativeRelease
              </span>
            )}
            {post.item_type === 'product' && (
              <span className="px-2 py-1 bg-blue-600/50 rounded-full text-xs font-medium">
                #DigitalProduct
              </span>
            )}
            {post.avg_rating && post.avg_rating > 4 && (
              <span className="px-2 py-1 bg-green-600/50 rounded-full text-xs font-medium">
                ⭐ Trending
              </span>
            )}
          </div>
        </div>

        {/* Price and action */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Price</p>
            <p className="text-xl font-bold">{formatPrice(post.price_eth)}</p>
          </div>
          <button className="flex-1 mx-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">
            Get Now
          </button>
        </div>
      </div>
    </div>
  );
}

interface CommentsSheetProps {
  post: SocialFeedPost;
  onClose: () => void;
}

function CommentsSheet({ post, onClose }: CommentsSheetProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComments = async () => {
      try {
        const { data, error } = await supabase
          .from('product_feedback_threads')
          .select(
            `
            id,
            title,
            rating,
            created_at,
            buyer_wallet,
            product_feedback_messages(id, body, sender_role, created_at)
          `
          )
          .eq('item_id', post.id)
          .eq('item_type', post.item_type)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setComments(data || []);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [post.id, post.item_type]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
      <div className="w-full bg-black rounded-t-2xl max-h-[90vh] flex flex-col border-t border-gray-800">
        {/* Header */}
        <div className="sticky top-0 p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold">Comments ({comments.length})</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <p className="text-gray-400 text-sm">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-gray-400 text-sm">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{comment.buyer_wallet?.slice(0, 8)}...</p>
                    {comment.rating && (
                      <p className="text-xs text-yellow-400">{'⭐'.repeat(comment.rating)}</p>
                    )}
                    <p className="text-sm text-gray-300 mt-1">
                      {comment.product_feedback_messages?.[0]?.body}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input */}
        <div className="sticky bottom-0 p-4 border-t border-gray-800 bg-black space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <button className="px-4 py-2 bg-purple-600 text-white rounded-full font-semibold text-sm hover:bg-purple-700 transition-colors disabled:opacity-50">
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SocialMediaFeedReleases;
