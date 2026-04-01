import MySubscriptionsPage from "@/pages/MySubscriptionsPage";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletSubscriptionsRoute = () => {
  return (
    <WalletRuntimeProvider>
      <MySubscriptionsPage />
    </WalletRuntimeProvider>
  );
};

export default WalletSubscriptionsRoute;
