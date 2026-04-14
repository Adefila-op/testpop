import deployed from "../../../deployed-addresses.json";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const fallback = (deployed as { CreativeReleaseEscrow?: string })?.CreativeReleaseEscrow;

export const CREATIVE_RELEASE_ESCROW_ADDRESS =
  import.meta.env.VITE_CREATIVE_RELEASE_ESCROW_ADDRESS?.trim() || fallback || ZERO_ADDRESS;
