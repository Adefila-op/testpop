/**
 * Stub Campaign V2 Hooks
 * These are disabled - onchain contracts have been removed
 */

export function useCreateCampaignV2() {
  return {
    createCampaignAsync: async () => {
      throw new Error("Onchain contracts are disabled");
    },
    isPending: false,
  };
}

export function useCampaignV2State() {
  return {
    isLoading: false,
    campaignDetails: null,
    error: null,
  };
}

export function useRedeemCampaignV2() {
  return {
    redeemAsync: async () => {
      throw new Error("Onchain contracts are disabled");
    },
    isPending: false,
  };
}
