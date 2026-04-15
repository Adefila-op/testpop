import { base, baseSepolia } from "wagmi/chains";
import { injected } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";
export const web3AuthClientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID?.trim() || "";

export const ACTIVE_CHAIN = baseSepolia;

export const networks = [baseSepolia, base] as const;

const connectorStack = [
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
