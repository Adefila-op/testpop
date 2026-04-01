import AdminPage from "@/pages/AdminPage";
import AdminGuard from "@/components/AdminGuard";
import WalletRuntimeProvider from "@/components/wallet/WalletRuntimeProvider";

const WalletAdminRoute = () => {
  return (
    <WalletRuntimeProvider>
      <AdminGuard>
        <AdminPage />
      </AdminGuard>
    </WalletRuntimeProvider>
  );
};

export default WalletAdminRoute;
