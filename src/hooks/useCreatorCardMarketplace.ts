import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';
import { useToast } from './use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MarketplaceTransaction {
  transactionHash: string;
  creatorAddress: string;
  price: string;
  timestamp: string;
  buyer: string;
  seller: string;
  status: 'pending' | 'confirmed' | 'failed';
}

interface BuyResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

interface ListResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

interface CreatorCardMarketplaceStats {
  totalListings: number;
  floorPrice: string;
  volume24h: string;
  sales24h: number;
  owners: string[];
}

const CREATOR_CARD_CONTRACT_ADDRESS = process.env.VITE_CREATOR_CARD_CONTRACT || '0x0000000000000000000000000000000000000000';

export function useCreatorCardMarketplace() {
  const { address: userAddress, signer } = useWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Fetch marketplace stats for a creator card
   */
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['creatorCardStats'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/creator-marketplace/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json() as Promise<CreatorCardMarketplaceStats>;
      } catch (err) {
        console.error('Error fetching marketplace stats:', err);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Buy a creator card NFT
   */
  const buyCreatorCard = useCallback(
    async (creatorAddress: string, priceInEth: string): Promise<BuyResult> => {
      if (!userAddress) {
        return {
          success: false,
          error: 'Wallet not connected',
        };
      }

      if (!signer) {
        return {
          success: false,
          error: 'Signer not available',
        };
      }

      try {
        // Call backend to initiate purchase
        const response = await fetch('/api/creator-marketplace/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorAddress,
            buyerAddress: userAddress,
            price: priceInEth,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: error.message || 'Purchase failed',
          };
        }

        const { transactionHash } = await response.json();

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['creatorCardStats'] });
        queryClient.invalidateQueries({ queryKey: ['creators'] });
        queryClient.invalidateQueries({ queryKey: ['userAssets'] });

        return {
          success: true,
          transactionHash,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to purchase creator card';
        return {
          success: false,
          error: message,
        };
      }
    },
    [userAddress, signer, queryClient]
  );

  /**
   * List a creator card for sale on the marketplace
   */
  const listCreatorCard = useCallback(
    async (tokenId: string, priceInEth: string): Promise<ListResult> => {
      if (!userAddress) {
        return {
          success: false,
          error: 'Wallet not connected',
        };
      }

      if (!signer) {
        return {
          success: false,
          error: 'Signer not available',
        };
      }

      try {
        const response = await fetch('/api/creator-marketplace/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenId,
            sellerAddress: userAddress,
            price: priceInEth,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: error.message || 'Failed to list card',
          };
        }

        const { transactionHash } = await response.json();

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['creatorCardStats'] });
        queryClient.invalidateQueries({ queryKey: ['userListings'] });

        return {
          success: true,
          transactionHash,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to list creator card';
        return {
          success: false,
          error: message,
        };
      }
    },
    [userAddress, signer, queryClient]
  );

  /**
   * Cancel a listing
   */
  const cancelListing = useCallback(
    async (listingId: string): Promise<{ success: boolean; error?: string }> => {
      if (!userAddress) {
        return {
          success: false,
          error: 'Wallet not connected',
        };
      }

      try {
        const response = await fetch(`/api/creator-marketplace/listings/${listingId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sellerAddress: userAddress }),
        });

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: error.message || 'Failed to cancel listing',
          };
        }

        queryClient.invalidateQueries({ queryKey: ['userListings'] });
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to cancel listing';
        return {
          success: false,
          error: message,
        };
      }
    },
    [userAddress, queryClient]
  );

  /**
   * Fetch user's creator card holdings
   */
  const { data: userCards, isLoading: cardsLoading } = useQuery({
    queryKey: ['userCreatorCards', userAddress],
    queryFn: async () => {
      if (!userAddress) return [];

      try {
        const response = await fetch(`/api/creator-marketplace/user/${userAddress}/cards`);
        if (!response.ok) throw new Error('Failed to fetch user cards');
        return response.json();
      } catch (err) {
        console.error('Error fetching user cards:', err);
        return [];
      }
    },
    enabled: !!userAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  /**
   * Fetch user's active listings
   */
  const { data: userListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['userCreatorCardListings', userAddress],
    queryFn: async () => {
      if (!userAddress) return [];

      try {
        const response = await fetch(`/api/creator-marketplace/user/${userAddress}/listings`);
        if (!response.ok) throw new Error('Failed to fetch listings');
        return response.json();
      } catch (err) {
        console.error('Error fetching user listings:', err);
        return [];
      }
    },
    enabled: !!userAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  /**
   * Fetch marketplace transaction history
   */
  const {
    data: transactionHistory,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['creatorCardTransactionHistory'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/creator-marketplace/history?limit=50');
        if (!response.ok) throw new Error('Failed to fetch history');
        return response.json() as Promise<MarketplaceTransaction[]>;
      } catch (err) {
        console.error('Error fetching transaction history:', err);
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds for live updates
  });

  /**
   * Get a specific creator card's marketplace info
   */
  const getCreatorCardInfo = useCallback(
    async (creatorAddress: string) => {
      try {
        const response = await fetch(
          `/api/creator-marketplace/info/${creatorAddress}`
        );
        if (!response.ok) throw new Error('Failed to fetch card info');
        return await response.json();
      } catch (error) {
        console.error('Error fetching creator card info:', error);
        return null;
      }
    },
    []
  );

  /**
   * Collection stats for a specific creator
   */
  const { data: creatorStats } = useQuery({
    queryKey: ['creatorCardCollection'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/creator-marketplace/collection/stats');
        if (!response.ok) throw new Error('Failed to fetch collection stats');
        return response.json();
      } catch (err) {
        console.error('Error fetching collection stats:', err);
        return null;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    // Mutations
    buyCreatorCard,
    listCreatorCard,
    cancelListing,

    // Queries
    stats,
    statsLoading,
    statsError,
    userCards,
    cardsLoading,
    userListings,
    listingsLoading,
    transactionHistory,
    historyLoading,
    creatorStats,

    // Utilities
    getCreatorCardInfo,
    refetchHistory,
  };
}
