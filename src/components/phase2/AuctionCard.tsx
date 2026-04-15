/**
 * Auction Card Component - Display live auctions
 * Shows auction details with bidding functionality
 */

import { useState, useEffect } from 'react';
import { useAuction } from '@/hooks/useAuctions';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Gavel, AlertCircle, Clock } from 'lucide-react';

interface AuctionCardProps {
  auctionId: string;
  onBidSuccess?: (bidAmount: string) => void;
  onBidError?: (error: Error) => void;
}

export function AuctionCard({
  auctionId,
  onBidSuccess,
  onBidError,
}: AuctionCardProps) {
  const { auction, isLoading } = useAuction(auctionId);
  const { address } = useWallet();
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Calculate time remaining
  useEffect(() => {
    if (!auction) return;

    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(auction.endsAt);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Ended');
      } else {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!auction) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            Auction not found
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleBid = async () => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    if (!bidAmount || isNaN(parseFloat(bidAmount))) {
      setError('Please enter a valid bid amount');
      return;
    }

    setIsBidding(true);
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidAmount }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Bid failed');
      }

      const data = await response.json();
      setBidAmount('');
      onBidSuccess?.(bidAmount);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Bid failed');
      setError(error.message);
      onBidError?.(error);
    } finally {
      setIsBidding(false);
    }
  };

  const isActive = auction.status === 'active';
  const isYourAuction = auction.creator === address;
  const isHighestBidder = auction.highestBidder === address;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square overflow-hidden bg-muted relative">
        <img
          src={auction.imageUrl}
          alt={auction.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform"
        />
        <Badge variant={isActive ? 'default' : 'secondary'} className="absolute top-2 right-2">
          {auction.status}
        </Badge>
      </div>
      <CardHeader>
        <div>
          <CardTitle className="line-clamp-2">{auction.name}</CardTitle>
          <CardDescription className="text-xs">{auction.creator}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{auction.description}</p>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Starting Bid</p>
            <p className="font-bold">{parseFloat(auction.startingBid) / 1e18} ETH</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Current Bid</p>
            <p className="font-bold">{parseFloat(auction.currentBid) / 1e18} ETH</p>
          </div>
        </div>

        {isActive && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
            <Clock className="w-4 h-4" />
            <span>{timeRemaining}</span>
          </div>
        )}

        {isHighestBidder && (
          <Badge variant="outline" className="w-full justify-center">
            You are the highest bidder
          </Badge>
        )}
      </CardContent>

      {isActive && !isYourAuction && (
        <CardFooter className="flex gap-2 flex-col">
          <Input
            type="number"
            placeholder="Bid amount (ETH)"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            disabled={isBidding || !address}
            step="0.01"
          />
          <Button
            onClick={handleBid}
            disabled={isBidding || !address || !bidAmount}
            className="w-full"
          >
            {isBidding && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            <Gavel className="mr-2 w-4 h-4" />
            Place Bid
          </Button>
          {error && (
            <div className="text-sm text-destructive flex gap-2 w-full items-start">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardFooter>
      )}

      {isYourAuction && (
        <CardFooter>
          <div className="w-full text-sm text-muted-foreground">
            <Badge variant="outline">This is your auction</Badge>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
