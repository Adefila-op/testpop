/**
 * Stub Artist Contract Hooks
 * These are disabled - onchain contracts have been removed
 */

export function useCreateDropArtist() {
  return {
    createDropAsync: async () => {
      throw new Error("Onchain contracts are disabled");
    },
    isPending: false,
  };
}

export function useGetArtistContractInfo() {
  return {
    contractAddress: null,
    isLoading: false,
  };
}

export function useMintArtist() {
  return {
    mintAsync: async () => {
      throw new Error("Onchain contracts are disabled");
    },
    isPending: false,
  };
}
