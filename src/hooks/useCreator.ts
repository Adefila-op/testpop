/**
 * Creator Hook - Creator earnings, payouts, and collaborators
 * Handles earnings tracking, payout claims, and revenue splits
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { SECURE_API_BASE } from '@/lib/apiBase';

export interface CreatorEarnings {
  pending: {
    amount: string;
    amountEth: string;
  };
  totalEarned: {
    amount: string;
    amountEth: string;
  };
  lastPayout: {
    amount: string;
    date: string;
    method: string;
  } | null;
}

export interface PayoutSettings {
  method: 'ETH' | 'USDC' | 'USDT' | 'ESCROW';
  payoutAddress: string | null;
  bankingVerified: boolean;
}

export interface PayoutRecord {
  id: string;
  amount: string;
  payout_method: string;
  completed_at: string;
  status: string;
  transaction_hash: string;
}

export interface Collaborator {
  address: string;
  shareBps: number;
  sharePercent: string;
}

export interface UseCreatorReturn {
  // Queries
  earnings: CreatorEarnings | null;
  settings: PayoutSettings | null;
  payoutHistory: PayoutRecord[] | null;
  collaborators: Collaborator[] | null;
  isLoadingEarnings: boolean;
  isLoadingHistory: boolean;
  isLoadingCollaborators: boolean;
  
  // Mutations
  setPayoutMethod: (method: 'ETH' | 'USDC' | 'USDT' | 'ESCROW', address?: string) => Promise<void>;
  claimPayouts: (method: string) => Promise<{ hash: string; amount: string }>;
  addCollaborator: (address: string, shareBps: number) => Promise<void>;
  removeCollaborator: (address: string) => Promise<void>;
  
  // Status
  isUpdatingSettings: boolean;
  isClaiming: boolean;
  isAddingCollaborator: boolean;
  isRemovingCollaborator: boolean;
  error: Error | null;
}

export function useCreator(): UseCreatorReturn {
  // Fetch creator earnings
  const {
    data: earningsData,
    isLoading: isLoadingEarnings,
  } = useQuery({
    queryKey: ['creator', 'earnings'],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/creator/earnings`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch earnings');
      const data = await response.json();
      return data as { earnings: CreatorEarnings; settings: PayoutSettings };
    },
    staleTime: 30000,
  });

  // Fetch payout history
  const {
    data: payoutHistory,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ['creator', 'payouts', 'history'],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/creator/payouts/history`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch payout history');
      const data = await response.json();
      return data.payouts as PayoutRecord[];
    },
    staleTime: 60000,
  });

  // Fetch collaborators
  const {
    data: collaborators,
    isLoading: isLoadingCollaborators,
  } = useQuery({
    queryKey: ['creator', 'collaborators'],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/creator/collaborators`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch collaborators');
      const data = await response.json();
      return data.collaborators as Collaborator[];
    },
    staleTime: 60000,
  });

  // Set payout method mutation
  const setSettingsMutation = useMutation({
    mutationFn: async ({
      method,
      address,
    }: {
      method: 'ETH' | 'USDC' | 'USDT' | 'ESCROW';
      address?: string;
    }) => {
      const response = await fetch(`${SECURE_API_BASE}/creator/payout-method`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          payoutAddress: address,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update payout method');
      return response.json();
    },
  });

  // Claim payouts mutation
  const claimMutation = useMutation({
    mutationFn: async (method: string) => {
      const response = await fetch(`${SECURE_API_BASE}/creator/payouts/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      
      if (!response.ok) throw new Error('Failed to claim payouts');
      return response.json();
    },
  });

  // Add collaborator mutation
  const addCollaboratorMutation = useMutation({
    mutationFn: async (input: { address: string; shareBps: number }) => {
      const response = await fetch(`${SECURE_API_BASE}/creator/collaborators`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) throw new Error('Failed to add collaborator');
      return response.json();
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await fetch(`${SECURE_API_BASE}/creator/collaborators/${address}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to remove collaborator');
      return response.json();
    },
  });

  return {
    earnings: earningsData?.earnings || null,
    settings: earningsData?.settings || null,
    payoutHistory: payoutHistory || null,
    collaborators: collaborators || null,
    isLoadingEarnings,
    isLoadingHistory,
    isLoadingCollaborators,
    
    setPayoutMethod: (method, address) =>
      setSettingsMutation.mutateAsync({ method, address }),
    claimPayouts: (method) => claimMutation.mutateAsync(method),
    addCollaborator: (address, shareBps) =>
      addCollaboratorMutation.mutateAsync({ address, shareBps }),
    removeCollaborator: (address) =>
      removeCollaboratorMutation.mutateAsync(address),
    
    isUpdatingSettings: setSettingsMutation.isPending,
    isClaiming: claimMutation.isPending,
    isAddingCollaborator: addCollaboratorMutation.isPending,
    isRemovingCollaborator: removeCollaboratorMutation.isPending,
    error:
      setSettingsMutation.error ||
      claimMutation.error ||
      addCollaboratorMutation.error ||
      removeCollaboratorMutation.error ||
      null,
  };
}
