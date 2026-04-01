import ArtistsPage from "@/pages/ArtistsPage";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletArtistsRoute = () => {
  return (
    <WalletRuntimeProvider>
      <ArtistsPage />
    </WalletRuntimeProvider>
  );
};

export default WalletArtistsRoute;
