import { useMemo } from "react";
import {
  decodeEventLog,
  getAddress,
  parseEther,
  zeroAddress,
} from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ACTIVE_CHAIN } from "@/lib/wagmi";
import {
  POAP_CAMPAIGN_V2_ABI,
  POAP_CAMPAIGN_V2_ADDRESS,
} from "@/lib/contracts/poapCampaignV2";

export type CampaignV2EntryMode = "eth" | "content" | "both";

export function entryModeToIndex(entryMode: CampaignV2EntryMode): 0 | 1 | 2 {
  if (entryMode === "content") return 1;
  if (entryMode === "both") return 2;
  return 0;
}

function normalizeAddress(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    return getAddress(value.trim());
  } catch {
    return null;
  }
}

export function useCreateCampaignV2() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const createCampaign = (params: {
    metadataUri: string;
    entryMode: CampaignV2EntryMode;
    maxSupply: number;
    ticketPriceEth: string;
    startTime: number;
    endTime: number;
    redeemStartTime: number;
  }) => {
    if (!address) throw new Error("Connect wallet to create a campaign");
    if (!params.metadataUri?.startsWith("ipfs://")) {
      throw new Error("Campaign metadata must be pinned to IPFS first");
    }
    if (params.maxSupply <= 0) {
      throw new Error("Campaign supply must be greater than 0");
    }

    const entryMode = entryModeToIndex(params.entryMode);
    const ticketPriceWei =
      params.entryMode === "content" ? 0n : parseEther(params.ticketPriceEth || "0");

    return writeContract({
      address: POAP_CAMPAIGN_V2_ADDRESS,
      abi: POAP_CAMPAIGN_V2_ABI,
      functionName: "createCampaign",
      args: [
        params.metadataUri,
        entryMode,
        BigInt(params.maxSupply),
        ticketPriceWei,
        BigInt(params.startTime),
        BigInt(params.endTime),
        BigInt(params.redeemStartTime),
      ],
      account: address,
      chain: ACTIVE_CHAIN,
    });
  };

  const createdCampaignId =
    receipt?.logs
      .map((log) => {
        try {
          const decoded = decodeEventLog({
            abi: POAP_CAMPAIGN_V2_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName !== "CampaignCreated") return null;
          return Number(decoded.args.campaignId);
        } catch {
          return null;
        }
      })
      .find((value): value is number => typeof value === "number") ?? null;

  return {
    createCampaign,
    createdCampaignId,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useBuyCampaignEntriesV2() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const buyEntries = (campaignId: number, quantity: number, ticketPriceEth: string) => {
    if (!address) throw new Error("Connect wallet to buy entries");
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be at least 1");
    }

    const totalValue = parseEther(ticketPriceEth || "0") * BigInt(quantity);

    return writeContract({
      address: POAP_CAMPAIGN_V2_ADDRESS,
      abi: POAP_CAMPAIGN_V2_ABI,
      functionName: "buyEntries",
      args: [BigInt(campaignId), BigInt(quantity)],
      value: totalValue,
      account: address,
      chain: ACTIVE_CHAIN,
    });
  };

  return { buyEntries, hash, isPending, isConfirming, isSuccess, error };
}

export function useRedeemCampaignV2() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const redeem = (campaignId: number, quantity: number) => {
    if (!address) throw new Error("Connect wallet to redeem");
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be at least 1");
    }

    return writeContract({
      address: POAP_CAMPAIGN_V2_ADDRESS,
      abi: POAP_CAMPAIGN_V2_ABI,
      functionName: "redeem",
      args: [BigInt(campaignId), BigInt(quantity)],
      account: address,
      chain: ACTIVE_CHAIN,
    });
  };

  return { redeem, hash, isPending, isConfirming, isSuccess, error };
}

export function useCampaignV2State(
  campaignId?: number | null,
  wallet?: string | null
) {
  const normalizedWallet = normalizeAddress(wallet);
  const enabled = campaignId !== null && campaignId !== undefined;

  const campaignQuery = useReadContract({
    address: POAP_CAMPAIGN_V2_ADDRESS,
    abi: POAP_CAMPAIGN_V2_ABI,
    functionName: "campaigns",
    args: enabled ? [BigInt(campaignId)] : undefined,
    query: { enabled },
  });

  const ethCreditsQuery = useReadContract({
    address: POAP_CAMPAIGN_V2_ADDRESS,
    abi: POAP_CAMPAIGN_V2_ABI,
    functionName: "ethCredits",
    args: enabled && normalizedWallet ? [BigInt(campaignId), normalizedWallet] : undefined,
    query: { enabled: enabled && Boolean(normalizedWallet) },
  });

  const contentCreditsQuery = useReadContract({
    address: POAP_CAMPAIGN_V2_ADDRESS,
    abi: POAP_CAMPAIGN_V2_ABI,
    functionName: "contentCredits",
    args: enabled && normalizedWallet ? [BigInt(campaignId), normalizedWallet] : undefined,
    query: { enabled: enabled && Boolean(normalizedWallet) },
  });

  const redeemedCreditsQuery = useReadContract({
    address: POAP_CAMPAIGN_V2_ADDRESS,
    abi: POAP_CAMPAIGN_V2_ABI,
    functionName: "redeemedCredits",
    args: enabled && normalizedWallet ? [BigInt(campaignId), normalizedWallet] : undefined,
    query: { enabled: enabled && Boolean(normalizedWallet) },
  });

  const redeemableQuery = useReadContract({
    address: POAP_CAMPAIGN_V2_ADDRESS,
    abi: POAP_CAMPAIGN_V2_ABI,
    functionName: "getRedeemableCount",
    args: enabled && normalizedWallet ? [BigInt(campaignId), normalizedWallet] : undefined,
    query: { enabled: enabled && Boolean(normalizedWallet) },
  });

  const campaign = useMemo(() => {
    const value = campaignQuery.data;
    if (!value) return null;
    return {
      artist: value[0] || zeroAddress,
      metadataUri: value[1] || "",
      entryMode: Number(value[2] ?? 0),
      status: Number(value[3] ?? 0),
      maxSupply: Number(value[4] ?? 0n),
      minted: Number(value[5] ?? 0n),
      ticketPriceWei: value[6] ?? 0n,
      startTime: Number(value[7] ?? 0n),
      endTime: Number(value[8] ?? 0n),
      redeemStartTime: Number(value[9] ?? 0n),
    };
  }, [campaignQuery.data]);

  return {
    campaign,
    ethCredits: Number(ethCreditsQuery.data ?? 0n),
    contentCredits: Number(contentCreditsQuery.data ?? 0n),
    redeemedCredits: Number(redeemedCreditsQuery.data ?? 0n),
    redeemableCredits: Number(redeemableQuery.data ?? 0n),
    isLoading:
      campaignQuery.isLoading ||
      ethCreditsQuery.isLoading ||
      contentCreditsQuery.isLoading ||
      redeemedCreditsQuery.isLoading ||
      redeemableQuery.isLoading,
    error:
      campaignQuery.error ||
      ethCreditsQuery.error ||
      contentCreditsQuery.error ||
      redeemedCreditsQuery.error ||
      redeemableQuery.error,
    refetchAll: async () => {
      await Promise.all([
        campaignQuery.refetch(),
        ethCreditsQuery.refetch(),
        contentCreditsQuery.refetch(),
        redeemedCreditsQuery.refetch(),
        redeemableQuery.refetch(),
      ]);
    },
  };
}
