import ArtistApplicationPage from "@/pages/ArtistApplicationPage";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletArtistApplicationRoute = () => {
  return (
    <WalletRuntimeProvider>
      <ArtistApplicationPage />
    </WalletRuntimeProvider>
  );
};

export default WalletArtistApplicationRoute;
