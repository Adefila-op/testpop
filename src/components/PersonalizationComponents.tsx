import React, { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  Sparkles,
  TrendingUp,
  Copy,
  Check,
  Mail
} from 'lucide-react';
import { supabase } from '@/lib/db';
import { CatalogItem, formatPrice } from '@/utils/catalogUtils';
import { useAccount } from 'wagmi';

interface SocialShareButtonProps {
  item: CatalogItem;
}

export function SocialShareButton({ item }: SocialShareButtonProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  const shareUrl = `${window.location.origin}/share/${item.item_type}/${item.id}`;

  const handleShare = async (platform: string) => {
    if (!address) return;

    try {
      setLoading(true);
      // Track share in database
      const response = await fetch('/api/personalization/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          item_type: item.item_type,
          share_platform: platform
        })
      });

      const data = await response.json();

      if (!data.platform_urls || !data.platform_urls[platform]) return;

      window.open(data.platform_urls[platform], '_blank', 'width=600,height=400');
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setLoading(false);
      setShowShareMenu(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="flex flex-col items-center gap-1 p-3 rounded-full hover:bg-white/10 transition-colors"
        disabled={loading}
      >
        <Share2 className="w-6 h-6" />
        <span className="text-xs font-medium">Share</span>
      </button>

      {showShareMenu && (
        <div className="absolute right-0 top-12 bg-black/90 backdrop-blur-lg border border-gray-700 rounded-lg p-2 space-y-2 w-48 z-50">
          <button
            onClick={() => handleShare('twitter')}
            className="w-full flex items-center gap-2 p-2 hover:bg-white/10 rounded text-sm text-left"
          >
            𝕏 Twitter
          </button>
          <button
            onClick={() => handleShare('facebook')}
            className="w-full flex items-center gap-2 p-2 hover:bg-white/10 rounded text-sm text-left"
          >
            f Facebook
          </button>
          <button
            onClick={() => handleShare('linkedin')}
            className="w-full flex items-center gap-2 p-2 hover:bg-white/10 rounded text-sm text-left"
          >
            in LinkedIn
          </button>
          <button
            onClick={() => handleShare('telegram')}
            className="w-full flex items-center gap-2 p-2 hover:bg-white/10 rounded text-sm text-left"
          >
            ✈️ Telegram
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            className="w-full flex items-center gap-2 p-2 hover:bg-white/10 rounded text-sm text-left"
          >
            💬 WhatsApp
          </button>
          <div className="border-t border-gray-700 pt-2">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2 p-2 hover:bg-white/10 rounded text-sm text-left"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface FavoritesButtonProps {
  item: CatalogItem;
}

export function FavoritesButton({ item }: FavoritesButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    if (!address) return;

    const checkFavorite = async () => {
      try {
        const { data } = await supabase
          .from('user_favorites')
          .select('id')
          .eq('user_wallet', address)
          .eq('item_id', item.id)
          .eq('item_type', item.item_type)
          .single();

        setIsFavorited(!!data);
      } catch (error) {
        // Not favorited or error
      }
    };

    checkFavorite();
  }, [address, item.id, item.item_type]);

  const handleToggleFavorite = async () => {
    if (!address) return;

    try {
      setLoading(true);

      if (isFavorited) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_wallet', address)
          .eq('item_id', item.id)
          .eq('item_type', item.item_type);
      } else {
        await supabase.from('user_favorites').insert({
          user_wallet: address,
          item_id: item.id,
          item_type: item.item_type
        });
      }

      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className="flex flex-col items-center gap-1 p-3 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
    >
      <Heart
        className={`w-6 h-6 ${
          isFavorited ? 'fill-red-500 text-red-500' : 'text-white'
        }`}
      />
      <span className="text-xs font-medium">
        {isFavorited ? 'Saved' : 'Save'}
      </span>
    </button>
  );
}

interface SubscribeButtonProps {
  creator_id: string;
  creator_wallet: string;
  className?: string;
}

export function SubscribeButton({ creator_id, creator_wallet, className = '' }: SubscribeButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    if (!address) return;

    const checkSubscription = async () => {
      try {
        const { data } = await supabase
          .from('creator_subscriptions')
          .select('id')
          .eq('subscriber_wallet', address)
          .eq('creator_id', creator_id)
          .single();

        setIsSubscribed(!!data);
      } catch (error) {
        // Not subscribed or error
      }
    };

    checkSubscription();
  }, [address, creator_id]);

  const handleToggleSubscribe = async () => {
    if (!address) return;

    try {
      setLoading(true);

      if (isSubscribed) {
        await supabase
          .from('creator_subscriptions')
          .delete()
          .eq('subscriber_wallet', address)
          .eq('creator_id', creator_id);
      } else {
        await supabase.from('creator_subscriptions').insert({
          subscriber_wallet: address,
          creator_id,
          creator_wallet,
          subscription_tier: 'free'
        });
      }

      setIsSubscribed(!isSubscribed);
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleSubscribe}
      disabled={loading || !address}
      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${className} ${
        isSubscribed
          ? 'bg-purple-600/50 text-white hover:bg-purple-600/70'
          : 'bg-white text-black hover:bg-gray-200'
      }`}
    >
      {isSubscribed ? 'Subscribed' : 'Subscribe'}
    </button>
  );
}

interface RecommendationsProps {
  item: CatalogItem;
}

export function Recommendations({ item }: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(
          `/api/personalization/recommendations/${item.id}/${item.item_type}?limit=5`
        );
        const data = await response.json();
        setRecommendations(data || []);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [item.id, item.item_type]);

  if (loading || recommendations.length === 0) return null;

  return (
    <div className="p-4 border-t border-gray-800 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold">People also bought</h3>
      </div>

      <div className="space-y-2">
        {recommendations.slice(0, 3).map((rec) => (
          <div
            key={`${rec.item_type}-${rec.id}`}
            className="p-2 bg-gray-900/50 rounded hover:bg-gray-900 transition-colors cursor-pointer"
          >
            <p className="text-sm font-medium line-clamp-1">{rec.title}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">
                {rec.item_type === 'drop' ? '🎨' : rec.item_type === 'product' ? '📦' : '🎬'}{' '}
                {rec.item_type}
              </span>
              <span className="text-xs font-semibold text-purple-400">Ξ{rec.price_eth}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Recommendations;
