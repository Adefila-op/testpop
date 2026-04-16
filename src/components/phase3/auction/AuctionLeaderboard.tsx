/**
 * Auction Leaderboard
 * Location: src/components/phase3/auction/AuctionLeaderboard.tsx
 * 
 * Shows current auction state and bidding leaderboard
 */

import React from 'react';
import { useGetAuctionDetails } from '@/hooks/useAuctionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Gavel, Zap, Users, Award } from 'lucide-react';
import { AuctionTimer } from './AuctionTimer';
import { BidHistoryList } from './BidHistoryList';
import { useFormatNumber } from '@/hooks/useCustomHooks';

interface AuctionLeaderboardProps {
  auctionId: string;
  productName?: string;
}

export function AuctionLeaderboard({ auctionId, productName }: AuctionLeaderboardProps) {
  const { data: auction, isLoading, error } = useGetAuctionDetails(auctionId);

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-sm text-red-600">Failed to load auction details</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full rounded" />
          <Skeleton className="h-12 w-full rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!auction) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">Auction not found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Auction Header */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Gavel className="w-5 h-5" />
                {productName || `Auction ${auctionId.slice(0, 8)}`}
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1 font-mono">{auctionId}</p>
            </div>
            <Badge variant="outline" className="text-lg">
              <Zap className="w-4 h-4 mr-1" />
              Live
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Current Bid */}
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Current Bid</p>
              <p className="text-2xl font-bold text-blue-900">
                {useFormatNumber(auction.currentBid || '0', 4)} ETH
              </p>
              <p className="text-xs text-gray-600 mt-1">
                ${(parseFloat(auction.currentBid || '0') * 2500).toFixed(0)}
              </p>
            </div>

            {/* Bid Count */}
            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-600 font-semibold uppercase mb-1 flex items-center justify-center gap-1">
                <Users className="w-4 h-4" />
                Total Bids
              </p>
              <p className="text-2xl font-bold text-purple-900">{auction.bidCount || 0}</p>
            </div>

            {/* Min Increment */}
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Min Increment</p>
              <p className="text-2xl font-bold text-green-900">
                {useFormatNumber(auction.minBidIncrement || '0', 4)} ETH
              </p>
            </div>
          </div>

          {/* Timer */}
          <AuctionTimer
            endTime={Math.floor(auction.endTime / 1000)}
            status={auction.status}
            extendCount={auction.extensionCount || 0}
          />

          {/* Auction Info */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded">
            <div>
              <p className="text-xs text-gray-600 font-semibold">HIGHEST BIDDER</p>
              <p className="text-sm font-mono mt-1">
                {auction.highestBidder
                  ? `${auction.highestBidder.slice(0, 6)}...${auction.highestBidder.slice(-4)}`
                  : 'No bids yet'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">AUCTION CREATED</p>
              <p className="text-sm mt-1">
                {new Date(auction.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Extensions Notice */}
          {auction.extensionCount && auction.extensionCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-200">
              <Award className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Auction Extended {auction.extensionCount}x
                </p>
                <p className="text-xs text-blue-700">
                  Auto-extends 10 minutes when bids are placed near the end
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bid History */}
      <BidHistoryList auctionId={auctionId} maxVisible={15} />
    </div>
  );
}

export default AuctionLeaderboard;
