import Index from "@/pages/Index";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletIndexRoute = () => {
  return (
    <WalletRuntimeProvider>
      <Index />
    </WalletRuntimeProvider>
  );
};

export default WalletIndexRoute;
