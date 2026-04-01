import MarketplacePage from "@/pages/MarketplacePage";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletMarketplaceRoute = () => {
  return (
    <WalletRuntimeProvider>
      <MarketplacePage />
    </WalletRuntimeProvider>
  );
};

export default WalletMarketplaceRoute;
