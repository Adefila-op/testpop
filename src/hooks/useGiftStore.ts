/**
 * Gift Store Hooks
 * Location: src/hooks/useGiftStore.ts
 * 
 * Wagmi hooks for NFT gifting and claiming
 */

import { useWriteContract, useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseEther } from 'ethers';
import { PRODUCT_STORE_ADDRESS } from '@/constants/addresses';
import { ProductStoreABI } from '@/constants/abis';

/**
 * Create a gift (send NFT to recipient email)
 * @param productId - Product to gift
 * @returns Gift creation function
 */
export function useCreateGift(productId: number) {
  const queryClient = useQueryClient();

  const { write, isLoading, isError, error } = useWriteContract({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'createGift',
    onSuccess(data) {
      console.log('✅ Gift created:', data.hash);
      queryClient.invalidateQueries({ queryKey: ['user-gifts'] });
    },
  });

  const { mutate: saveGiftMetadata } = useMutation({
    mutationFn: async (giftData) => {
      const response = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(giftData),
      });
      if (!response.ok) throw new Error('Failed to save gift');
      return response.json();
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['user-gifts'] });
    },
  });

  return {
    write: (recipientEmail: string, message: string) => {
      write?.({
        args: [productId, recipientEmail, message],
      });
    },
    saveMetadata: saveGiftMetadata,
    isLoading,
    isError,
    error,
  };
}

/**
 * Claim a received gift
 * @returns Gift claim function
 */
export function useClaimGift() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const { write, isLoading, isError, error } = useWriteContract({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'claimGift',
    onSuccess(data) {
      console.log('✅ Gift claimed:', data.hash);
      queryClient.invalidateQueries({ queryKey: ['user-nfts', address] });
      queryClient.invalidateQueries({ queryKey: ['pending-gifts'] });
    },
    onError(error) {
      console.error('❌ Claim failed:', error);
    },
  });

  return {
    write: (giftId: number) => write?.({ args: [giftId] }),
    isLoading,
    isError,
    error,
  };
}

/**
 * Get pending gifts for current user
 * @returns List of unclaimed gifts
 */
export function usePendingGifts() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['pending-gifts', address],
    queryFn: async () => {
      const response = await fetch('/api/gifts/pending');
      if (!response.ok) throw new Error('Failed to fetch gifts');
      return response.json();
    },
    enabled: !!address,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get gift details by claim token
 * @param giftId - Gift ID
 * @param claimToken - Secure claim token
 * @returns Gift details for claiming
 */
export function useGetGiftClaimDetails(giftId: number, claimToken: string) {
  return useQuery({
    queryKey: ['gift-claim', giftId, claimToken],
    queryFn: async () => {
      const response = await fetch(
        `/api/gifts/${giftId}/claim-link?token=${claimToken}`
      );
      if (!response.ok) throw new Error('Invalid claim token');
      return response.json();
    },
    enabled: !!giftId && !!claimToken,
  });
}

/**
 * Get gift details
 * @param giftId - Gift ID
 * @returns Gift information
 */
export function useGetGift(giftId: number) {
  return useQuery({
    queryKey: ['gift', giftId],
    queryFn: async () => {
      const response = await fetch(`/api/gifts/${giftId}`);
      if (!response.ok) throw new Error('Failed to fetch gift');
      return response.json();
    },
    enabled: !!giftId,
  });
}

/**
 * Claim gift via API
 * @param giftId - Gift ID
 * @returns Gift claim mutation
 */
export function useClaimGiftViaAPI(giftId: number) {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimToken: string) => {
      const response = await fetch(`/api/gifts/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimToken }),
      });
      if (!response.ok) throw new Error('Failed to claim gift');
      return response.json();
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['pending-gifts'] });
      queryClient.invalidateQueries({ queryKey: ['user-nfts', address] });
    },
  });
}

/**
 * Get user's sent gifts
 * @returns Gifts sent by user
 */
export function useGetSentGifts() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['sent-gifts', address],
    queryFn: async () => {
      const response = await fetch(`/api/gifts/sent`);
      if (!response.ok) throw new Error('Failed to fetch gifts');
      return response.json();
    },
    enabled: !!address,
  });
}

export default {
  useCreateGift,
  useClaimGift,
  usePendingGifts,
  useGetGiftClaimDetails,
  useGetGift,
  useClaimGiftViaAPI,
  useGetSentGifts,
};
