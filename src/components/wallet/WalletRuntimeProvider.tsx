import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";

type WalletRuntimeProviderProps = {
  children: ReactNode;
};

const WalletRuntimeProvider = ({ children }: WalletRuntimeProviderProps) => {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
};

export default WalletRuntimeProvider;
