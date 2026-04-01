import ProfilePage from "@/pages/ProfilePage";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletProfileRoute = () => {
  return (
    <WalletRuntimeProvider>
      <ProfilePage />
    </WalletRuntimeProvider>
  );
};

export default WalletProfileRoute;
