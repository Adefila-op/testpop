import MyPOAPsPage from "@/pages/MyPOAPsPage";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletPOAPsRoute = () => {
  return (
    <WalletRuntimeProvider>
      <MyPOAPsPage />
    </WalletRuntimeProvider>
  );
};

export default WalletPOAPsRoute;
