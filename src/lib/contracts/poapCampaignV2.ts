import deployed from "../../../deployed-addresses.json";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const fallback = (deployed as { POAPCampaignV2?: string })?.POAPCampaignV2;

export const POAP_CAMPAIGN_V2_ADDRESS =
  import.meta.env.VITE_POAP_CAMPAIGN_V2_ADDRESS?.trim() || fallback || ZERO_ADDRESS;
