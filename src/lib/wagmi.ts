import { base, baseSepolia } from "wagmi/chains";
import { injected } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { web3AuthConnector } from "@/lib/web3authConnector";

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";
export const web3AuthClientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID?.trim() || "";

export const ACTIVE_CHAIN = baseSepolia;

export const networks = [baseSepolia, base] as const;

const connectorStack = [
  ...(web3AuthClientId ? [web3AuthConnector()] : []),
  injected(),
];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  connectors: connectorStack,
  ssr: false,
});

export const config = wagmiAdapter.wagmiConfig;

export const isWeb3AuthConfigured = Boolean(web3AuthClientId);
