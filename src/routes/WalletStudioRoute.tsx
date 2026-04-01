import ArtistStudioPage from "@/pages/ArtistStudioPage";
import ArtistGuard from "@/components/ArtistGuard";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletStudioRoute = () => {
  return (
    <WalletRuntimeProvider>
      <ArtistGuard>
        <ArtistStudioPage />
      </ArtistGuard>
    </WalletRuntimeProvider>
  );
};

export default WalletStudioRoute;
