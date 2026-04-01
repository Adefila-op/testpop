import ArtistProfilePage from "@/pages/ArtistProfilePage";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletArtistProfileRoute = () => {
  return (
    <WalletRuntimeProvider>
      <ArtistProfilePage />
    </WalletRuntimeProvider>
  );
};

export default WalletArtistProfileRoute;
