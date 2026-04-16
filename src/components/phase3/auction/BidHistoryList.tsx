/**
 * Bid History List
 * Location: src/components/phase3/auction/BidHistoryList.tsx
 * 
 * Shows chronological list of all bids in an auction
 */

import React, { useMemo } from 'react';
import { useBidHistory } from '@/hooks/useAuctionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Trophy, User2, Clock } from 'lucide-react';
import { useFormatNumber } from '@/hooks/useCustomHooks';

interface BidHistoryListProps {
  auctionId: string;
  maxVisible?: number;
}

interface Bid {
  id: string;
  bidder: string;
  amount: string;
  timestamp: number;
  isWinning?: boolean;
}

export function BidHistoryList({ auctionId, maxVisible = 10 }: BidHistoryListProps) {
  const { data: bidData, isLoading, error } = useBidHistory(auctionId);

  const bids = useMemo(() => {
    if (!bidData) return [];
    // Ensure bids are in chronological order (newest first)
    return [...bidData]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxVisible) as Bid[];
  }, [bidData, maxVisible]);

  const highestBid = useMemo(() => {
    if (!bids || bids.length === 0) return null;
    return bids[0]; // First one after sorting by timestamp desc
  }, [bids]);

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-sm text-red-600">Failed to load bid history</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Bid History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!bids || bids.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Bid History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 text-center py-4">
            No bids yet. Be the first to bid!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Bid History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0 divide-y">
          {bids.map((bid, index) => {
            const isHighest = bid.id === highestBid?.id;
            return (
              <div
                key={bid.id}
                className={`py-3 px-2 flex items-center justify-between transition-colors ${
                  isHighest ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User2 className="w-3.5 h-3.5 text-gray-500" />
                      <p className="font-mono text-sm font-semibold">
                        {formatAddress(bid.bidder)}
                      </p>
                      {isHighest && (
                        <Badge variant="default" className="ml-1">
                          <Trophy className="w-3 h-3 mr-1" />
                          Highest
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(bid.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    {useFormatNumber(bid.amount, 4)} ETH
                  </div>
                  <div className="text-xs text-gray-600">
                    ${(parseFloat(bid.amount) * 2500).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {bidData && bidData.length > maxVisible && (
          <div className="mt-3 pt-3 border-t text-center">
            <button className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              View all {bidData.length} bids
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BidHistoryList;
