import { useCallback, useMemo, useState } from "react";
import { useAccount, useBalance, useConnect, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import type { Address } from "viem";
import { ACTIVE_CHAIN } from "@/lib/wagmi";
import { openWalletConnectModal } from "@/lib/appKit";
import { isWeb3AuthEnabled } from "@/lib/web3auth";
import { getSubscriberCount, isSubscribed, markSubscribed } from "@/lib/subscriptionStore";

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

  const reset = useCallback(() => {
    setState({ isPending: false, isConfirming: false, isSuccess: false, error: null });
  }, []);

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

  return { ...state, run, reset };
}

export function useWallet() {
  const account = useAccount();
  const { data: balance } = useBalance({ address: account.address });
  const { connectAsync, isPending: isConnecting } = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();

  const injectedConnector = useMemo(
    () => connectors.find((connector) => connector.id === "injected") || connectors[0],
    [connectors],
  );
  const web3AuthConnector = useMemo(
    () => connectors.find((connector) => connector.id === "web3auth"),
    [connectors],
  );

  const connectWallet = useCallback(async () => {
    if (injectedConnector) {
      await connectAsync({ connector: injectedConnector });
      return;
    }
    await openWalletConnectModal();
  }, [connectAsync, injectedConnector]);

  const connectWeb3Auth = useCallback(async () => {
    if (!isWeb3AuthEnabled()) {
      throw new Error("Web3Auth is not configured.");
    }
    if (!web3AuthConnector) {
      throw new Error("Web3Auth connector is unavailable.");
    }
    await connectAsync({ connector: web3AuthConnector });
  }, [connectAsync, web3AuthConnector]);

  const requestActiveChainSwitch = useCallback(
    async (_message?: string) => {
      if (!account.chain?.id) return;
      if (account.chain.id === ACTIVE_CHAIN.id) return;
      await switchChainAsync({ chainId: ACTIVE_CHAIN.id });
    },
    [account.chain?.id, switchChainAsync],
  );

  return {
    address: account.address,
    isConnected: account.isConnected,
    isConnecting,
    chain: account.chain,
    balance,
    connectorId: account.connector?.id,
    connectorName: account.connector?.name,
    connectWallet,
    connectWeb3Auth,
    disconnect,
    requestActiveChainSwitch,
    isSwitchingNetwork,
  };
}

export function useSubscribeToArtistContract(contractAddress?: string | null) {
  const { run, ...state } = useAsyncAction();
  const account = useAccount();

  const subscribe = useCallback(
    async (_priceEth: string) => {
      if (!contractAddress) {
        throw new Error("Artist contract is not configured.");
      }
      await run(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 600));
      });
      if (account.address) {
        markSubscribed(account.address, contractAddress);
      }
      return `0xsub_${Date.now().toString(16)}`;
    },
    [account.address, contractAddress, run],
  );

  return {
    subscribe,
    ...state,
  };
}

export function useIsSubscribedToArtistContract(contractAddress?: string | null, wallet?: Address | null) {
  const [nonce, setNonce] = useState(0);

  const subscribed = useMemo(() => {
    if (!wallet || !contractAddress) return false;
    return isSubscribed(wallet, contractAddress);
  }, [contractAddress, wallet, nonce]);

  const refetch = useCallback(() => {
    setNonce((value) => value + 1);
  }, []);

  return {
    isSubscribed: subscribed,
    isLoading: false,
    refetch,
  };
}

export function useGetSubscriberCountFromArtistContract(contractAddress?: string | null) {
  const [nonce, setNonce] = useState(0);
  const count = useMemo(() => {
    if (!contractAddress) return 0;
    return getSubscriberCount(contractAddress);
  }, [contractAddress, nonce]);

  return {
    count,
    isLoading: false,
    refetch: () => setNonce((value) => value + 1),
  };
}

export function useCreateCampaign() {
  const { run, ...state } = useAsyncAction();

  const createCampaign = useCallback(
    async (
      _metadataUri: string,
      _campaignType: number,
      _totalPoaps: number,
      _start: number,
      _end: number,
      _subscriberPct: number,
      _bidderPct: number,
      _creatorPct: number,
    ) => {
      await run(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 800));
      });
      return `0xcampaign_${Date.now().toString(16)}`;
    },
    [run],
  );

  return {
    createCampaign,
    ...state,
  };
}

export function usePlaceBid() {
  const { run, ...state } = useAsyncAction();

  const placeBid = useCallback(
    async (_dropId: number, _amountEth: string, _contractAddress?: string | null) => {
      await run(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
      });
      return `0xbid_${Date.now().toString(16)}`;
    },
    [run],
  );

  return {
    placeBid,
    ...state,
  };
}

export function markArtistSubscribed(wallet: string, contract: string) {
  markSubscribed(wallet, contract);
}
