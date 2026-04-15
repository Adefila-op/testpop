/**
 * Royalties Hook - Secondary market royalty tracking
 * Handles royalty configuration, tracking, and claiming
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { SECURE_API_BASE } from '@/lib/apiBase';

export interface RoyaltyConfig {
  tokenId: string;
  royaltyPercentage: string;
  royaltyBps: string;
  recipients: Array<{
    address: string;
    shareBps: number;
    sharePercent: string;
  }>;
  created: string;
  totalEarned: string;
}

export interface RoyaltySale {
  token_id: string;
  sale_price: string;
  royalty_amount: string;
  seller_address: string;
  marketplace: string;
  recorded_at: string;
  status: string;
}

export interface RoyaltyStats {
  totalEarned: {
    amount: string;
    amountEth: string;
  };
  totalClaimed: {
    amount: string;
    amountEth: string;
  };
  pendingClaim: {
    amount: string;
    amountEth: string;
  };
  totalSales: number;
  tokensWithRoyalties: number;
  marketplaces: Record<string, number>;
}

export interface UseRoyaltiesReturn {
  // Queries
  stats: RoyaltyStats | null;
  pendingRoyalties: RoyaltySale[] | null;
  royaltyHistory: RoyaltySale[] | null;
  isLoadingStats: boolean;
  isLoadingPending: boolean;
  isLoadingHistory: boolean;
  
  // Mutations
  configureRoyalty: (
    tokenId: string,
    royaltyBps: number,
    recipients: Array<{ address: string; shareBps: number }>
  ) => Promise<{ success: boolean }>;
  claimRoyalties: (tokenIds: string[]) => Promise<{ hash: string; amount: string }>;
  recordSale: (
    tokenId: string,
    salePrice: string,
    seller: string,
    marketplace: string
  ) => Promise<{ success: boolean }>;
  
  // Status
  isConfiguring: boolean;
  isClaiming: boolean;
  isRecording: boolean;
  error: Error | null;
}

export function useRoyalties(): UseRoyaltiesReturn {
  // Fetch royalty stats
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['royalties', 'stats'],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/royalties/stats`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch royalty stats');
      const data = await response.json();
      return data.stats as RoyaltyStats;
    },
    staleTime: 30000,
  });

  // Fetch pending royalties
  const {
    data: pendingRoyalties,
    isLoading: isLoadingPending,
  } = useQuery({
    queryKey: ['royalties', 'pending'],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/royalties/pending`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch pending royalties');
      const data = await response.json();
      return data.pending as RoyaltySale[];
    },
    staleTime: 30000,
  });

  // Fetch royalty history
  const {
    data: royaltyHistory,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ['royalties', 'history'],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/royalties/history`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch royalty history');
      const data = await response.json();
      return data.recentSales as RoyaltySale[];
    },
    staleTime: 60000,
  });

  // Configure royalty mutation
  const configureMutation = useMutation({
    mutationFn: async (input: {
      tokenId: string;
      royaltyBps: number;
      recipients: Array<{ address: string; shareBps: number }>;
    }) => {
      const response = await fetch(`${SECURE_API_BASE}/royalties/${input.tokenId}/configure`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          royaltyBps: input.royaltyBps,
          recipients: input.recipients,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to configure royalty');
      return response.json();
    },
  });

  // Claim royalties mutation
  const claimMutation = useMutation({
    mutationFn: async (tokenIds: string[]) => {
      const response = await fetch(`${SECURE_API_BASE}/royalties/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIds }),
      });
      
      if (!response.ok) throw new Error('Failed to claim royalties');
      return response.json();
    },
  });

  // Record sale mutation
  const recordSaleMutation = useMutation({
    mutationFn: async (input: {
      tokenId: string;
      salePrice: string;
      seller: string;
      marketplace: string;
    }) => {
      const response = await fetch(`${SECURE_API_BASE}/royalties/${input.tokenId}/record`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salePrice: input.salePrice,
          seller: input.seller,
          marketplace: input.marketplace,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to record sale');
      return response.json();
    },
  });

  return {
    stats: stats || null,
    pendingRoyalties: pendingRoyalties || null,
    royaltyHistory: royaltyHistory || null,
    isLoadingStats,
    isLoadingPending,
    isLoadingHistory,
    
    configureRoyalty: (tokenId, royaltyBps, recipients) =>
      configureMutation.mutateAsync({ tokenId, royaltyBps, recipients }),
    claimRoyalties: (tokenIds) => claimMutation.mutateAsync(tokenIds),
    recordSale: (tokenId, salePrice, seller, marketplace) =>
      recordSaleMutation.mutateAsync({ tokenId, salePrice, seller, marketplace }),
    
    isConfiguring: configureMutation.isPending,
    isClaiming: claimMutation.isPending,
    isRecording: recordSaleMutation.isPending,
    error: configureMutation.error || claimMutation.error || recordSaleMutation.error || null,
  };
}

/**
 * Single token royalty config hook
 */
export function useTokenRoyalties(tokenId: string) {
  const {
    data: config,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['royalties', tokenId],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/royalties/${tokenId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch token royalties');
      return response.json() as Promise<RoyaltyConfig>;
    },
    enabled: !!tokenId,
    staleTime: 30000,
  });

  return { config: config || null, isLoading, error };
}
