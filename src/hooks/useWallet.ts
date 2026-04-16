import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain, useWalletClient } from "wagmi";
import { ACTIVE_CHAIN } from "@/lib/wagmi";

export function useWallet() {
  const { address, chain, connector, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connectAsync, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    query: {
      enabled: Boolean(address),
    },
  });
  const { data: walletClient } = useWalletClient({
    query: {
      enabled: Boolean(address),
    },
  });
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();

  async function connectWallet() {
    try {
      // Log available connectors for debugging
      console.log('📱 Available connectors:', connectors.map(c => c.name));
      
      const connectorToUse = connectors?.[0];
      if (!connectorToUse) {
        const errorMsg = "No wallet connector is available. Please check your wallet setup.";
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`🔗 Connecting with ${connectorToUse.name}...`);
      const result = await connectAsync({ connector: connectorToUse });
      console.log('✅ Wallet connected:', result);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Connection error:', errorMsg);
      throw error;
    }
  }

  async function connectWeb3Auth() {
    return connectWallet();
  }

  async function requestActiveChainSwitch(message?: string) {
    if (!address) {
      throw new Error(message || "Connect a wallet before switching networks.");
    }

    if (chain?.id === ACTIVE_CHAIN.id) {
      return chain;
    }

    try {
      console.log(`🔄 Switching to ${ACTIVE_CHAIN.name} (chain id: ${ACTIVE_CHAIN.id})...`);
      return await switchChainAsync({ chainId: ACTIVE_CHAIN.id });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const fallbackMessage = message || `Switch your wallet to ${ACTIVE_CHAIN.name} and try again.`;
      console.error('❌ Chain switch error:', errorMsg);
      throw new Error(errorMsg || fallbackMessage);
    }
  }

  return {
    address,
    balance,
    chain,
    connectorName: connector?.name || "",
    connectWallet,
    connectWeb3Auth,
    disconnect,
    isConnected,
    isConnecting: isConnecting || isReconnecting || isPending,
    isSwitchingNetwork,
    requestActiveChainSwitch,
    signer: walletClient ?? null,
  };
}
