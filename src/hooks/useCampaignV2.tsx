import { useCallback, useMemo, useState } from "react";

type AsyncActionState = {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
};

function useAsyncAction() {
  const [state, setState] = useState<AsyncActionState>({
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
  });

  const run = useCallback(async (runner: () => Promise<void>) => {
    setState({ isPending: true, isConfirming: false, isSuccess: false, error: null });
    try {
      await runner();
      setState({ isPending: false, isConfirming: true, isSuccess: false, error: null });
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      setState({ isPending: false, isConfirming: false, isSuccess: true, error: null });
    } catch (error) {
      setState({ isPending: false, isConfirming: false, isSuccess: false, error: error as Error });
      throw error;
    }
  }, []);

  return { ...state, run };
}

export function useCreateCampaignV2() {
  const { run, ...state } = useAsyncAction();
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);

  const createCampaign = useCallback(
    async () => {
      await run(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 900));
      });
      setCreatedCampaignId(Math.floor(Math.random() * 10000) + 1);
    },
    [run],
  );

  return {
    createCampaign,
    createdCampaignId,
    ...state,
  };
}

type CampaignState = {
  entryMode: number;
  startTime: number;
  endTime: number;
  redeemStartTime: number;
  ticketPriceWei?: bigint;
};

export function useCampaignV2State(
  campaignId?: number | null,
  _wallet?: string | null,
  _contractAddress?: string | null,
) {
  const [nonce, setNonce] = useState(0);

  const campaign = useMemo<CampaignState | null>(() => {
    if (!campaignId) return null;
    const now = Math.floor(Date.now() / 1000);
    return {
      entryMode: 2,
      startTime: now - 3600,
      endTime: now + 24 * 3600,
      redeemStartTime: now + 24 * 3600,
      ticketPriceWei: 0n,
    };
  }, [campaignId, nonce]);

  return {
    campaign,
    ethCredits: 0,
    contentCredits: 0,
    redeemedCredits: 0,
    redeemableCredits: 0,
    isLoading: false,
    refetchAll: () => setNonce((value) => value + 1),
  };
}

export function useBuyCampaignEntriesV2() {
  const { run, ...state } = useAsyncAction();

  const buyEntries = useCallback(
    async (_contractAddress?: string | null, _campaignId?: number | null, _quantity?: number) => {
      await run(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
      });
      return `0xbuy_${Date.now().toString(16)}`;
    },
    [run],
  );

  return {
    buyEntries,
    ...state,
  };
}

export function useRedeemCampaignV2() {
  const { run, ...state } = useAsyncAction();

  const redeem = useCallback(
    async (_contractAddress?: string | null, _campaignId?: number | null, _quantity?: number) => {
      await run(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
      });
      return `0xredeem_${Date.now().toString(16)}`;
    },
    [run],
  );

  return {
    redeem,
    ...state,
  };
}
