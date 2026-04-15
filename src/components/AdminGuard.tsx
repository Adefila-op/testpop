import { Shield, Wallet, AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { ADMIN_WALLETS, isAdminWallet } from "@/lib/admin";
import { establishSecureSession } from "@/lib/secureAuth";
import { getRuntimeSession, clearRuntimeSession } from "@/lib/runtimeSession";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Wraps the admin panel. Shows a lock screen if:
 *   - no wallet is connected
 *   - the connected wallet is not the admin wallet
 */
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected, isConnecting, connectWallet, disconnect } = useWallet();
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [resolvedRole, setResolvedRole] = useState<string>("");
  const normalizedAddress = address?.toLowerCase() || "";
  const walletIsAuthorized = isAdminWallet(address);
  const runtimeSession = getRuntimeSession();
  const backendSaysAdmin =
    runtimeSession.wallet === normalizedAddress && runtimeSession.role === "admin";
  const shouldAttemptAdminAuth = Boolean(isConnected && address);

  // Establish secure session as soon as a wallet is connected, then trust backend role.
  useEffect(() => {
    if (shouldAttemptAdminAuth && (!sessionEstablished || runtimeSession.wallet !== normalizedAddress)) {
      establishSecureSession(address)
        .then((session) => {
          setSessionEstablished(true);
          setSessionError(null);
          setResolvedRole(session.role || "");
          console.log("✅ Secure session established:", session.role);
        })
        .catch((error) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error("❌ Failed to establish secure session:", errorMsg);
          setSessionError(errorMsg || "Failed to authenticate with backend");
          setResolvedRole("");
          toast.error(`Authentication failed: ${errorMsg}`);
        });
    }
  }, [address, normalizedAddress, runtimeSession.wallet, sessionEstablished, shouldAttemptAdminAuth]);

  // Reset session when wallet disconnects or changes.
  useEffect(() => {
    if (!isConnected) {
      setSessionEstablished(false);
      setSessionError(null);
      setResolvedRole("");
      clearRuntimeSession();
      return;
    }

    if (runtimeSession.wallet && runtimeSession.wallet !== normalizedAddress) {
      setSessionEstablished(false);
      setSessionError(null);
      setResolvedRole("");
      clearRuntimeSession();
    }
  }, [isConnected, normalizedAddress, runtimeSession.wallet]);

  // ── Not connected ───────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-3xl bg-secondary flex items-center justify-center mb-6">
          <Shield className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Admin Access</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs">
          This area is restricted. Connect the authorised admin wallet to continue.
        </p>
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="rounded-full gradient-primary text-primary-foreground font-semibold px-8 h-12"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  // ── Connected but wrong wallet ───────────────────────────────────────────────
  if (!sessionEstablished && shouldAttemptAdminAuth && !sessionError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-3xl bg-secondary flex items-center justify-center mb-6">
          <Shield className="h-10 w-10 text-primary animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Establishing Secure Session</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs">
          Authenticating with the backend server...
        </p>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (sessionEstablished && resolvedRole !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-sm text-muted-foreground mb-2 max-w-xs">
          This wallet is not authorised to access the admin panel.
        </p>
        <p className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg mb-8 max-w-xs truncate">
          {address}
        </p>
        <div className="w-full max-w-lg rounded-2xl border border-border bg-secondary/40 p-4 text-left mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Admin Access Diagnostic
          </p>
          <p className="text-xs font-mono break-all text-foreground mb-2">
            Connected: {address || "none"}
          </p>
          <p className="text-xs font-mono break-all text-foreground mb-2">
            Normalized: {normalizedAddress || "none"}
          </p>
          <p className="text-xs font-mono break-all text-foreground mb-2">
            Backend role: {resolvedRole || "none"}
          </p>
          <p className="text-xs font-mono break-all text-foreground">
            Allowed: {ADMIN_WALLETS.length > 0 ? ADMIN_WALLETS.join(", ") : "none"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => disconnect()}
          className="rounded-full px-8 h-11 gap-2"
        >
          <LogOut className="h-4 w-4" />
          Disconnect & try another wallet
        </Button>
      </div>
    );
  }

  // ── Authorised ──────────────────────────────────────────────────────────────
  if (sessionError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Authentication Error</h1>
        <p className="text-sm text-muted-foreground mb-2 max-w-xs">
          Failed to establish secure session with the backend.
        </p>
        <p className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg mb-8 max-w-xs">
          {sessionError}
        </p>
        <p className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg mb-8 max-w-xs break-all">
          Local admin match: {walletIsAuthorized ? "yes" : "no"}
        </p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="rounded-full px-8 h-11 gap-2"
        >
          <LogOut className="h-4 w-4" />
          Refresh Page
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
