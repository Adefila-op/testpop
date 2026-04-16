/**
 * Creator Payout Store Hooks
 * Location: src/hooks/usePayoutStore.ts
 * 
 * Wagmi hooks for creator earnings, payouts, and royalties
 */

import { useContractWrite, useContractRead, useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'ethers';
import {
  PAYOUT_DISTRIBUTOR_ADDRESS,
  ROYALTY_MANAGER_ADDRESS,
} from '@/constants/addresses';
import {
  PayoutDistributorABI,
  RoyaltyManagerABI,
} from '@/constants/abis';

/**
 * Get creator's pending and total earnings
 * @returns Earnings data from contract and API
 */
export function useGetCreatorEarnings() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['creator-earnings', address],
    queryFn: async () => {
      const response = await fetch('/api/creator/earnings');
      if (!response.ok) throw new Error('Failed to fetch earnings');
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

/**
 * Set creator's payout method
 * @returns Payout method mutation
 */
export function useSetPayoutMethod() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      method: 'bank' | 'crypto' | 'stripe';
      payoutAddress: string;
    }) => {
      const response = await fetch('/api/creator/payout-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to set payout method');
      return response.json();
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['creator-earnings'] });
    },
  });
}

/**
 * Claim pending creator payouts
 * @returns Payout claim mutation
 */
export function useClaimPayouts() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (method: 'bank' | 'crypto' | 'stripe') => {
      const response = await fetch('/api/creator/payouts/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      if (!response.ok) throw new Error('Failed to claim payouts');
      return response.json();
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['creator-earnings', address] });
      queryClient.invalidateQueries({ queryKey: ['payout-history'] });
    },
  });
}

/**
 * Get creator's payout history
 * @returns List of past payouts
 */
export function usePayoutHistory(limit = 20) {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['payout-history', address, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/creator/payouts/history?limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
    enabled: !!address,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get creator dashboard data (earnings, products, sales)
 * @returns Complete dashboard summary
 */
export function useGetCreatorDashboard() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['creator-dashboard', address],
    queryFn: async () => {
      const response = await fetch('/api/creator/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      return response.json();
    },
    enabled: !!address,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get creator's royalty balance
 * @returns Pending royalties and claim history
 */
export function useGetRoyaltyBalance() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['royalty-balance', address],
    queryFn: async () => {
      const response = await fetch('/api/creator/royalties/balance');
      if (!response.ok) throw new Error('Failed to fetch royalty balance');
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 15000, // Poll every 15 seconds
  });
}

/**
 * Claim accumulated royalties from secondary sales
 * @returns Royalty claim mutation
 */
export function useClaimRoyalties() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenAddress: string) => {
      const response = await fetch('/api/creator/royalties/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress }),
      });
      if (!response.ok) throw new Error('Failed to claim royalties');
      return response.json();
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['royalty-balance', address] });
      queryClient.invalidateQueries({
        queryKey: ['creator-dashboard', address],
      });
    },
  });
}

/**
 * Get creator's royalty history
 * @returns Royalty payments and claims
 */
export function useGetRoyaltyHistory(limit = 50) {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['royalty-history', address, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/creator/royalties/history?limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch royalty history');
      return response.json();
    },
    enabled: !!address,
    staleTime: 120000, // 2 minutes
  });
}

/**
 * Get statistics for creator
 * @returns Creator statistics (products, sales, earnings)
 */
export function useGetCreatorStats() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['creator-stats', address],
    queryFn: async () => {
      const response = await fetch('/api/creator/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!address,
    staleTime: 60000,
  });
}

/**
 * Monitor pending payout on-chain
 * @returns Pending payout amount from contract
 */
export function useGetOnChainEscrow(creatorAddress?: string) {
  const { address } = useAccount();
  const targetAddress = creatorAddress || address;

  const { data, isLoading, isError } = useContractRead({
    address: PAYOUT_DISTRIBUTOR_ADDRESS,
    abi: PayoutDistributorABI,
    functionName: 'getCreatorEscrow',
    args: [targetAddress],
    enabled: !!targetAddress,
  });

  return {
    pendingEth: data ? formatEther(data) : '0',
    isLoading,
    isError,
  };
}

/**
 * Get creator's configured payout method
 * @returns Current payout method
 */
export function useGetPayoutMethod(creatorAddress?: string) {
  const { address } = useAccount();
  const targetAddress = creatorAddress || address;

  const { data, isLoading, isError } = useContractRead({
    address: PAYOUT_DISTRIBUTOR_ADDRESS,
    abi: PayoutDistributorABI,
    functionName: 'creatorPayoutMethod',
    args: [targetAddress],
    enabled: !!targetAddress,
  });

  const methods = ['bank', 'crypto', 'stripe'];
  return {
    method: data ? methods[parseInt(data)] : null,
    isLoading,
    isError,
  };
}

export default {
  useGetCreatorEarnings,
  useSetPayoutMethod,
  useClaimPayouts,
  usePayoutHistory,
  useGetCreatorDashboard,
  useGetRoyaltyBalance,
  useClaimRoyalties,
  useGetRoyaltyHistory,
  useGetCreatorStats,
  useGetOnChainEscrow,
  useGetPayoutMethod,
};
