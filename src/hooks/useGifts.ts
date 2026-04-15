/**
 * Gifts Hook - NFT gifting system operations
 * Handles creating gifts, claiming, and managing gift history
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { SECURE_API_BASE } from '@/lib/apiBase';

export interface Gift {
  id: string;
  tokenId: string;
  senderName: string;
  senderWallet: string;
  recipientEmail: string;
  recipientWallet: string | null;
  status: 'pending' | 'claimed' | 'expired';
  createdAt: string;
  claimedAt: string | null;
  expiresAt: string;
  message: string;
  nftMetadata: {
    name: string;
    image: string;
    description: string;
  };
}

export interface CreateGiftInput {
  tokenId: string;
  recipientEmail: string;
  message?: string;
  expirationDays?: number;
}

export interface ClaimGiftInput {
  giftId: string;
  claimToken: string;
  recipientWallet: string;
}

export interface UseGiftsReturn {
  // Queries
  sentGifts: Gift[] | null;
  receivedGifts: Gift[] | null;
  isLoadingSent: boolean;
  isLoadingReceived: boolean;
  
  // Mutations
  createGift: (input: CreateGiftInput) => Promise<{ id: string; claimLink: string }>;
  claimGift: (input: ClaimGiftInput) => Promise<{ hash: string; tokenId: string }>;
  verifyClaimLink: (giftId: string, claimToken: string) => Promise<Gift>;
  
  // Status
  isCreating: boolean;
  isClaiming: boolean;
  isVerifying: boolean;
  error: Error | null;
}

export function useGifts(): UseGiftsReturn {
  // Fetch sent gifts
  const {
    data: sentGifts,
    isLoading: isLoadingSent,
  } = useQuery({
    queryKey: ['gifts', 'sent'],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/gifts/sent`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch sent gifts');
      const data = await response.json();
      return data.gifts as Gift[];
    },
    staleTime: 30000,
  });

  // Fetch received gifts
  const {
    data: receivedGifts,
    isLoading: isLoadingReceived,
  } = useQuery({
    queryKey: ['gifts', 'received'],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/gifts/pending`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch received gifts');
      const data = await response.json();
      return data.gifts as Gift[];
    },
    staleTime: 30000,
  });

  // Create gift mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateGiftInput) => {
      const response = await fetch(`${SECURE_API_BASE}/gifts/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) throw new Error('Failed to create gift');
      return response.json();
    },
  });

  // Claim gift mutation
  const claimMutation = useMutation({
    mutationFn: async (input: ClaimGiftInput) => {
      const response = await fetch(`${SECURE_API_BASE}/gifts/${input.giftId}/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken: input.claimToken,
          recipientWallet: input.recipientWallet,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to claim gift');
      return response.json();
    },
  });

  // Verify claim link mutation
  const verifyMutation = useMutation({
    mutationFn: async (input: { giftId: string; claimToken: string }) => {
      const response = await fetch(
        `${SECURE_API_BASE}/gifts/${input.giftId}/claim-link?token=${input.claimToken}`,
        {
          credentials: 'include',
        }
      );
      
      if (!response.ok) throw new Error('Failed to verify claim link');
      return response.json();
    },
  });

  return {
    sentGifts: sentGifts || null,
    receivedGifts: receivedGifts || null,
    isLoadingSent,
    isLoadingReceived,
    
    createGift: (input) => createMutation.mutateAsync(input),
    claimGift: (input) => claimMutation.mutateAsync(input),
    verifyClaimLink: (giftId, claimToken) =>
      verifyMutation.mutateAsync({ giftId, claimToken }),
    
    isCreating: createMutation.isPending,
    isClaiming: claimMutation.isPending,
    isVerifying: verifyMutation.isPending,
    error: createMutation.error || claimMutation.error || verifyMutation.error || null,
  };
}
