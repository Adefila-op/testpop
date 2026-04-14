import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, type SafeEventEmitterProvider } from "@web3auth/base";
import { baseSepolia } from "wagmi/chains";

const web3AuthClientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID?.trim() || "";
const web3AuthNetwork = import.meta.env.VITE_WEB3AUTH_NETWORK?.trim() || "sapphire_devnet";

let web3AuthPromise: Promise<Web3Auth | null> | null = null;

function getChainConfig() {
  return {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: `0x${baseSepolia.id.toString(16)}`,
    rpcTarget: baseSepolia.rpcUrls.default.http[0],
    displayName: baseSepolia.name,
    blockExplorerUrl: baseSepolia.blockExplorers?.default?.url || "https://sepolia.basescan.org",
    ticker: "ETH",
    tickerName: "Ethereum",
  };
}

export function isWeb3AuthEnabled() {
  return Boolean(web3AuthClientId);
}

export async function initWeb3Auth(): Promise<Web3Auth | null> {
  if (!web3AuthClientId) {
    return null;
  }

  if (!web3AuthPromise) {
    web3AuthPromise = (async () => {
      const instance = new Web3Auth({
        clientId: web3AuthClientId,
        web3AuthNetwork,
        chainConfig: getChainConfig(),
      });

      try {
        await instance.initModal();
      } catch (error) {
        console.warn("Web3Auth init failed:", error);
        return null;
      }

      return instance;
    })();
  }

  return web3AuthPromise;
}

export async function connectWeb3Auth(): Promise<SafeEventEmitterProvider> {
  const web3auth = await initWeb3Auth();
  if (!web3auth) {
    throw new Error("Web3Auth is not configured.");
  }

  const provider = await web3auth.connect();
  if (!provider) {
    throw new Error("Web3Auth did not return a provider.");
  }

  return provider as SafeEventEmitterProvider;
}

export async function getWeb3AuthProvider(): Promise<SafeEventEmitterProvider | null> {
  const web3auth = await initWeb3Auth();
  if (!web3auth?.provider) {
    return null;
  }
  return web3auth.provider as SafeEventEmitterProvider;
}

export async function logoutWeb3Auth(): Promise<void> {
  const web3auth = await initWeb3Auth();
  if (web3auth?.connected) {
    await web3auth.logout();
  }
}
