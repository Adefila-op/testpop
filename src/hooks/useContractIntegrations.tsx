import { useMemo } from "react";
import deployed from "../../deployed-addresses.json";

type DeployedAddresses = {
  ArtDropFactory?: { address?: string };
};

export function useResolvedArtistContract(artistWallet?: string | null, contractAddress?: string | null) {
  return useMemo(() => {
    if (contractAddress && contractAddress.trim()) {
      return contractAddress;
    }
    const fallback = (deployed as DeployedAddresses)?.ArtDropFactory?.address;
    return fallback || (artistWallet && artistWallet.trim() ? artistWallet : null);
  }, [artistWallet, contractAddress]);
}

/**
 * Alias for useResolvedArtistContract for backward compatibility
 */
export function useGetArtistContract(artistWallet?: string | null, contractAddress?: string | null) {
  return useResolvedArtistContract(artistWallet, contractAddress);
}
