import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Heart, Share2, ShoppingCart, TrendingUp, Check, AlertCircle } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useCreatorCardMarketplace } from '@/hooks/useCreatorCardMarketplace';
import { useToast } from '@/hooks/use-toast';

interface Creator {
  id: string;
  address: string;
  name: string;
  image: string;
  bio: string;
  collectionAddress: string;
  collectionName?: string;
  price?: string;
  cardTokenId?: string;
  sales24h?: number;
  volume24h?: string;
  verified?: boolean;
  followerCount?: number;
}

interface CreatorMarketplaceCardProps {
  creator: Creator;
  onBuy?: (creator: Creator) => void;
  onViewProfile?: (creatorId: string) => void;
}

const DEFAULT_CREATOR_PRICE = '0.5'; // Default 0.5 ETH per card

export function CreatorMarketplaceCard({
  creator,
  onBuy,
  onViewProfile,
}: CreatorMarketplaceCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address: userAddress } = useWallet();
  const { buyCreatorCard, listCreatorCard } = useCreatorCardMarketplace();
  const { toast } = useToast();

  const cardPrice = creator.price || DEFAULT_CREATOR_PRICE;
  const isOwner = userAddress?.toLowerCase() === creator.address.toLowerCase();

  const handleBuyClick = async () => {
    if (!userAddress) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to purchase creator cards.',
        variant: 'destructive',
      });
      return;
    }

    if (isOwner) {
      toast({
        title: 'Cannot buy own card',
        description: 'You already own this creator card.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await buyCreatorCard(creator.address, cardPrice);
      
      if (result.success) {
        toast({
          title: 'Purchase successful!',
          description: `You've purchased ${creator.name}'s creator card for ${cardPrice} ETH.`,
        });
        onBuy?.(creator);
        setIsOpen(false);
      } else {
        toast({
          title: 'Purchase failed',
          description: result.error || 'Failed to complete purchase',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const text = `Check out ${creator.name}'s creator card on POPUP marketplace!`;
    const url = `${window.location.origin}/creator/${creator.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Creator Card',
          text,
          url,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast({
        title: 'Link copied!',
        description: 'Creator card link copied to clipboard.',
      });
    }
  };

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-purple-500/50 transition-all duration-300 h-full flex flex-col">
      {/* Hero Image Section */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
        <img
          src={creator.image}
          alt={creator.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Verified Badge */}
        {creator.verified && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-blue-500/90 text-white flex items-center gap-1">
              <Check className="w-3 h-3" />
              Verified
            </Badge>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-slate-400">Creator Card Price</div>
              <div className="text-2xl font-bold text-white">{cardPrice} ETH</div>
            </div>
            {creator.sales24h !== undefined && (
              <div className="text-right flex items-center gap-1 text-emerald-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                {creator.sales24h} sales
              </div>
            )}
          </div>
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm rounded-full p-2 hover:bg-slate-900 transition-colors"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-300'
            }`}
          />
        </button>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Creator Info */}
        <div className="mb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-white text-lg line-clamp-1">{creator.name}</h3>
              <p className="text-xs text-slate-400">Creator Card NFT</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 line-clamp-2">{creator.bio}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 py-3 border-y border-slate-700/50">
          <div className="text-center">
            <div className="text-xs text-slate-400">24h Volume</div>
            <div className="font-semibold text-white text-sm">{creator.volume24h || '0 ETH'}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">Followers</div>
            <div className="font-semibold text-white text-sm">
              {creator.followerCount ? `${(creator.followerCount / 1000).toFixed(1)}k` : '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">Floor Price</div>
            <div className="font-semibold text-white text-sm">{cardPrice}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isOwner ? 'Your Card' : 'Buy Now'}
              </Button>
            </DialogTrigger>

            {!isOwner && (
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle>Purchase Creator Card</DialogTitle>
                  <DialogDescription>
                    Purchase {creator.name}'s creator NFT card
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Preview */}
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <img
                      src={creator.image}
                      alt={creator.name}
                      className="w-full h-48 object-cover rounded mb-4"
                    />
                    <h4 className="font-semibold text-white mb-2">{creator.name}</h4>
                    <p className="text-sm text-slate-300">{creator.bio}</p>
                  </div>

                  {/* Price Info */}
                  <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Creator Card Price</span>
                      <span className="font-semibold text-white">{cardPrice} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gas Fee</span>
                      <span className="font-semibold text-white">~0.01 ETH</span>
                    </div>
                    <div className="border-t border-slate-700 pt-3 flex justify-between">
                      <span className="font-semibold text-white">Total</span>
                      <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {(parseFloat(cardPrice) + 0.01).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>

                  {/* OpenSea Link */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-400 font-medium mb-1">Also available on OpenSea</p>
                      <p className="text-blue-300/70">You can list or trade this card on OpenSea after purchase</p>
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <Button
                    onClick={handleBuyClick}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                    size="lg"
                  >
                    {isLoading ? 'Processing...' : 'Confirm Purchase'}
                  </Button>
                </div>
              </DialogContent>
            )}
          </Dialog>

          {onViewProfile && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-slate-600 hover:bg-slate-800"
              onClick={() => onViewProfile(creator.id)}
            >
              Profile
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="px-3"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
