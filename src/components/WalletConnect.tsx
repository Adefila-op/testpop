import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Copy, Check, AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { formatEther } from "viem";
import { ACTIVE_CHAIN, isWeb3AuthConfigured } from "@/lib/wagmi";
import { toast } from "sonner";

const WalletConnect = () => {
  const {
    address,
    isConnected,
    isConnecting,
    chain,
    balance,
    connectWallet,
    connectWeb3Auth,
    requestActiveChainSwitch,
    isSwitchingNetwork,
    disconnect,
    connectorName,
  } = useWallet();
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isWeb3AuthConnecting, setIsWeb3AuthConnecting] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const isWrongNetwork = isConnected && chain?.id !== ACTIVE_CHAIN.id;

  // Mobile-optimized connect button
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          size="sm"
          className="rounded-full gradient-primary text-primary-foreground font-semibold text-sm px-3 h-8 md:h-9 md:px-4"
        >
          <Wallet className="h-3.5 w-3.5 mr-1.5 md:h-4 md:w-4 md:mr-2" />
          <span className="hidden xs:inline">{isConnecting ? "Connecting..." : "Connect"}</span>
          <span className="xs:hidden">{isConnecting ? "..." : "Connect"}</span>
        </Button>
        {isWeb3AuthConfigured && (
          <Button
            onClick={async () => {
              try {
                setIsWeb3AuthConnecting(true);
                await connectWeb3Auth();
              } catch (error) {
                const message = error instanceof Error ? error.message : "Web3Auth connection failed.";
                toast.error(message);
              } finally {
                setIsWeb3AuthConnecting(false);
              }
            }}
            disabled={isConnecting || isWeb3AuthConnecting}
            size="sm"
            variant="outline"
            className="rounded-full border-slate-200 text-sm px-3 h-8 md:h-9 md:px-4"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden xs:inline">{isWeb3AuthConnecting ? "Signing in..." : "Web3Auth"}</span>
            <span className="xs:hidden">{isWeb3AuthConnecting ? "..." : "Auth"}</span>
          </Button>
        )}
      </div>
    );
  }

  // Wrong network state - mobile optimized
  if (isWrongNetwork) {
    return (
      <div className="flex items-center gap-1 md:gap-2">
        <Button
          size="sm"
          onClick={async () => {
            try {
              await requestActiveChainSwitch(`A wallet switch is required before you can use POPUP on ${ACTIVE_CHAIN.name}.`);
            } catch (error) {
              const message = error instanceof Error ? error.message : `Switch to ${ACTIVE_CHAIN.name} in your wallet`;
              toast.error(message);
            }
          }}
          disabled={isSwitchingNetwork}
          className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8 px-3"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">
            {isSwitchingNetwork ? `Switching...` : `Switch to ${ACTIVE_CHAIN.name}`}
          </span>
          <span className="sm:hidden">{isSwitchingNetwork ? "..." : "Switch"}</span>
        </Button>
        <button
          onClick={() => disconnect()}
          className="p-1.5 rounded-full bg-secondary hover:bg-destructive/10 transition-colors"
          title="Disconnect"
        >
          <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // Connected state - mobile optimized with collapsible details
  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* Network and balance - collapsible on mobile */}
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium hover:bg-accent/80 transition-colors"
        >
          <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary animate-pulse" />
          <span className="hidden sm:inline">{chain?.name ?? ACTIVE_CHAIN.name}</span>
          <span className="sm:hidden">Base</span>
          <span className="text-muted-foreground hidden md:inline">·</span>
          <span className="hidden md:inline">{balance ? `${parseFloat(formatEther(balance.value)).toFixed(3)} ETH` : "..."}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>

        {/* Mobile dropdown for balance */}
        {showDetails && (
          <div className="absolute top-full mt-1 right-0 bg-popover border border-border rounded-lg p-2 shadow-lg z-50 min-w-[160px] space-y-1">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Balance</div>
              <div className="text-sm font-medium">
                {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ETH` : "..."}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Connected via</div>
              <div className="text-xs font-semibold text-foreground">{connectorName || "Wallet"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Address button - mobile optimized */}
      <button
        onClick={copyAddress}
        className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors min-w-0"
      >
        <span className="truncate max-w-[60px] md:max-w-none">
          {address && shortenAddress(address)}
        </span>
        {copied ? <Check className="h-3 w-3 text-primary flex-shrink-0" /> : <Copy className="h-3 w-3 flex-shrink-0" />}
      </button>

      {/* Disconnect button */}
      <button
        onClick={() => disconnect()}
        className="p-1.5 rounded-full bg-secondary hover:bg-destructive/10 transition-colors flex-shrink-0"
        title="Disconnect"
      >
        <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
};

export default WalletConnect;
