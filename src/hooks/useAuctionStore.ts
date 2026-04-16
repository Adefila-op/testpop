/**
 * Auction Store Hooks
 * Location: src/hooks/useAuctionStore.ts
 * 
 * Wagmi hooks for auction creation, bidding, and management
 */

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseEther, formatEther } from 'ethers';
import { PRODUCT_STORE_ADDRESS, AUCTION_MANAGER_ADDRESS } from '@/constants/addresses';
import { ProductStoreABI, AuctionManagerABI } from '@/constants/abis';

/**
 * Create an auction for a product
 * @param productId - Product to auction
 * @returns Auction creation function
 */
export function useCreateAuction(productId: number) {
  const queryClient = useQueryClient();

  const { write, isLoading, isError, error } = useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'createAuction',
    onSuccess(data) {
      console.log('✅ Auction created:', data.hash);
      queryClient.invalidateQueries({ queryKey: ['auctions', productId] });
    },
  });

  return {
    write: (startPrice: string, duration: number, minIncrement: string) => {
      write?.({
        args: [
          productId,
          parseEther(startPrice),
          duration,
          parseEther(minIncrement),
        ],
      });
    },
    isLoading,
    isError,
    error,
  };
}

/**
 * Place a bid on an auction
 * @param auctionId - Auction ID
 * @returns Bid placement function
 */
export function usePlaceBid(auctionId: number) {
  const queryClient = useQueryClient();

  const { write, isLoading, isError, error } = useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'placeBid',
    onSuccess(data) {
      console.log('✅ Bid placed:', data.hash);
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['bid-history', auctionId] });
    },
    onError(error) {
      console.error('❌ Bid failed:', error);
    },
  });

  return {
    write: (bidAmount: string) => {
      write?.({
        args: [auctionId, parseEther(bidAmount)],
        value: parseEther(bidAmount),
      });
    },
    isLoading,
    isError,
    error,
  };
}

/**
 * Get current auction state from blockchain
 * @param auctionId - Auction ID
 * @returns Current auction state
 */
export function useGetAuctionState(auctionId: number) {
  const { data, isLoading, isError } = useContractRead({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'getAuctionState',
    args: [auctionId],
    watch: true, // Real-time updates
  });

  if (!data) return { state: null, isLoading, isError };

  return {
    state: {
      id: data[0].toString(),
      productId: data[1].toString(),
      seller: data[2],
      startPrice: formatEther(data[3]),
      highestBid: formatEther(data[4]),
      highestBidder: data[5],
      endTime: new Date(parseInt(data[6]) * 1000),
      settled: data[7],
    },
    isLoading,
    isError,
  };
}

/**
 * Get detailed auction information with bid history
 * @param auctionId - Auction ID
 * @returns Full auction details from API
 */
export function useGetAuctionDetails(auctionId: number) {
  return useQuery({
    queryKey: ['auction', auctionId],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/${auctionId}`);
      if (!response.ok) throw new Error('Failed to fetch auction');
      return response.json();
    },
    enabled: !!auctionId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

/**
 * Get bid history for an auction
 * @param auctionId - Auction ID
 * @returns List of bids in chronological order
 */
export function useBidHistory(auctionId: number) {
  return useQuery({
    queryKey: ['bid-history', auctionId],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/${auctionId}/bid-history`);
      if (!response.ok) throw new Error('Failed to fetch bid history');
      return response.json();
    },
    enabled: !!auctionId,
    refetchInterval: 3000, // Poll every 3 seconds
  });
}

/**
 * Get all active auctions
 * @returns List of active auctions
 */
export function useGetActiveAuctions() {
  return useQuery({
    queryKey: ['auctions-active'],
    queryFn: async () => {
      const response = await fetch('/api/auctions?status=active');
      if (!response.ok) throw new Error('Failed to fetch auctions');
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get auctions for a specific product
 * @param productId - Product ID
 * @returns Product auctions
 */
export function useGetProductAuctions(productId: number) {
  return useQuery({
    queryKey: ['auctions', productId],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/auctions`);
      if (!response.ok) throw new Error('Failed to fetch auctions');
      return response.json();
    },
    enabled: !!productId,
  });
}

/**
 * Get user's auction activity
 * @returns User's created and participated auctions
 */
export function useGetUserAuctionActivity() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['user-auction-activity', address],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/user/${address}`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    },
    enabled: !!address,
    staleTime: 60000,
  });
}

/**
 * Settle a completed auction
 * @param auctionId - Auction ID
 * @returns Settlement transaction
 */
export function useSettleAuction(auctionId: number) {
  const queryClient = useQueryClient();

  const { write, isLoading, isError } = useContractWrite({
    address: AUCTION_MANAGER_ADDRESS,
    abi: AuctionManagerABI,
    functionName: 'settleAuction',
    onSuccess(data) {
      console.log('✅ Auction settled:', data.hash);
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
    },
  });

  return {
    write: () => write?.({ args: [auctionId] }),
    isLoading,
    isError,
  };
}

/**
 * Get user's NFTs (auction history/won items)
 */
export function useGetUserNFTs() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['user-nfts', address],
    queryFn: async () => {
      const response = await fetch(`/api/user/${address}/nfts`);
      if (!response.ok) throw new Error('Failed to fetch NFTs');
      return response.json();
    },
    enabled: !!address,
    staleTime: 60000,
  });
}


export default {
  useCreateAuction,
  usePlaceBid,
  useGetAuctionState,
  useGetAuctionDetails,
  useBidHistory,
  useGetActiveAuctions,
  useGetProductAuctions,
  useGetUserAuctionActivity,
  useSettleAuction,
};
