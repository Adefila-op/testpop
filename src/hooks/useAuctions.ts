/**
 * Auctions Hook - English auction system operations
 * Handles auction creation, bidding, and settlement
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { SECURE_API_BASE } from '@/lib/apiBase';

export interface Auction {
  id: string;
  tokenId: string;
  creator: string;
  name: string;
  description: string;
  imageUrl: string;
  startingBid: string;
  currentBid: string;
  highestBidder: string | null;
  status: 'active' | 'ended' | 'settled';
  endsAt: string;
  startedAt: string;
  totalBids: number;
}

export interface AuctionBid {
  id: string;
  bidder: string;
  amount: string;
  amountEth: string;
  timestamp: string;
  transactionHash: string;
}

export interface CreateAuctionInput {
  tokenId: string;
  startingBid: string; // in wei
  durationMinutes: number;
  metadata?: Record<string, any>;
}

export interface PlaceBidInput {
  auctionId: string;
  bidAmount: string; // in wei
}

export interface UseAuctionsReturn {
  // Queries
  auctions: Auction[] | null;
  auction: Auction | null;
  bids: AuctionBid[] | null;
  isLoadingAuctions: boolean;
  isLoadingAuction: boolean;
  isLoadingBids: boolean;
  
  // Mutations
  createAuction: (input: CreateAuctionInput) => Promise<{ id: string }>;
  placeBid: (input: PlaceBidInput) => Promise<{ hash: string; bidAmount: string }>;
  settleAuction: (auctionId: string) => Promise<{ hash: string; winner: string }>;
  
  // Status
  isCreating: boolean;
  isBidding: boolean;
  isSettling: boolean;
  error: Error | null;
}

export function useAuctions(creatorFilter?: string): UseAuctionsReturn {
  // Fetch auctions list
  const {
    data: auctions,
    isLoading: isLoadingAuctions,
  } = useQuery({
    queryKey: ['auctions', creatorFilter],
    queryFn: async () => {
      const url = creatorFilter
        ? `${SECURE_API_BASE}/auctions?creatorId=${creatorFilter}`
        : `${SECURE_API_BASE}/auctions`;
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch auctions');
      const data = await response.json();
      return data.auctions as Auction[];
    },
    staleTime: 10000, // More frequent updates for auctions
  });

  // Create auction mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateAuctionInput) => {
      const response = await fetch(`${SECURE_API_BASE}/auctions/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) throw new Error('Failed to create auction');
      return response.json();
    },
  });

  // Place bid mutation
  const bidMutation = useMutation({
    mutationFn: async (input: PlaceBidInput) => {
      const response = await fetch(`${SECURE_API_BASE}/auctions/${input.auctionId}/bids`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidAmount: input.bidAmount }),
      });
      
      if (!response.ok) throw new Error('Failed to place bid');
      return response.json();
    },
  });

  // Settle auction mutation
  const settleMutation = useMutation({
    mutationFn: async (auctionId: string) => {
      const response = await fetch(`${SECURE_API_BASE}/auctions/${auctionId}/settle`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to settle auction');
      return response.json();
    },
  });

  return {
    auctions: auctions || null,
    auction: null,
    bids: null,
    isLoadingAuctions,
    isLoadingAuction: false,
    isLoadingBids: false,
    
    createAuction: (input) => createMutation.mutateAsync(input),
    placeBid: (input) => bidMutation.mutateAsync(input),
    settleAuction: (auctionId) => settleMutation.mutateAsync(auctionId),
    
    isCreating: createMutation.isPending,
    isBidding: bidMutation.isPending,
    isSettling: settleMutation.isPending,
    error: createMutation.error || bidMutation.error || settleMutation.error || null,
  };
}

/**
 * Single auction with bid history hook
 */
export function useAuction(auctionId: string) {
  const {
    data: auctionData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auction', auctionId],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/auctions/${auctionId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch auction');
      const data = await response.json();
      return {
        auction: data.auction as Auction,
        bids: data.bids as AuctionBid[],
      };
    },
    enabled: !!auctionId,
    staleTime: 5000,
    refetchInterval: 5000, // Auto-refresh for live updates
  });

  return {
    auction: auctionData?.auction || null,
    bids: auctionData?.bids || null,
    isLoading,
    error,
    refetch,
  };
}
