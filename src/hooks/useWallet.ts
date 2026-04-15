/**
 * Simple Wallet Hook
 * Location: src/hooks/useWallet.ts
 * 
 * Provides basic wallet connection functionality using wagmi
 */

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = () => {
    const connector = connectors[0]; // Use first available connector
    if (connector) {
      connect({ connector });
    }
  };

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isReconnecting || isPending,
    connectWallet,
    disconnect,
  };
}
