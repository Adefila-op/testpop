import MyCollectionPage from "@/pages/MyCollectionPage";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletCollectionRoute = () => {
  return (
    <WalletRuntimeProvider>
      <MyCollectionPage />
    </WalletRuntimeProvider>
  );
};

export default WalletCollectionRoute;
