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

export function useMintArtist() {
  const { run, ...state } = useAsyncAction();
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);

  const mint = useCallback(
    async (_dropId: number, _priceWei: bigint, _contractAddress?: string | null) => {
      await run(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
      });
      setMintedTokenId(Math.floor(Math.random() * 1_000_000) + 1);
    },
    [run],
  );

  return {
    mint,
    mintedTokenId,
    ...state,
  };
}

export function useCreateDropArtist(_contractAddress?: string | null) {
  const { run, ...state } = useAsyncAction();
  const [createdDropId, setCreatedDropId] = useState<number | null>(null);

  const createDrop = useCallback(
    async () => {
      await run(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 900));
      });
      setCreatedDropId(Math.floor(Math.random() * 10000) + 1);
    },
    [run],
  );

  return {
    createDrop,
    createdDropId,
    ...state,
  };
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
