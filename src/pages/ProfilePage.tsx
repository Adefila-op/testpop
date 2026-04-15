import { useEffect, useMemo, useState } from "react";
import { Award, Gift, Loader2, LogOut, Package, Shield, ShoppingBag, ShoppingCart, Sparkles, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import MyCollectionPage from "@/pages/MyCollectionPage";
import MyPOAPsPage from "@/pages/MyPOAPsPage";
import MySubscriptionsPage from "@/pages/MySubscriptionsPage";
import ArtistStudioPage from "@/pages/ArtistStudioPage";
import ArtistApplicationPage from "@/pages/ArtistApplicationPage";
import { getArtistApplication } from "@/lib/db";
import { establishSecureSession } from "@/lib/secureAuth";
import { getArtistWhitelist, isWhitelistedArtistSync } from "@/lib/whitelist";

type CollectorSection = "collection" | "poaps" | "subscriptions" | "studio";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { address, isConnected, disconnect } = useWallet();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<CollectorSection>("collection");
  const [artistApproved, setArtistApproved] = useState(false);
  const [artistStatusLoading, setArtistStatusLoading] = useState(false);
  const [artistApplicationStatus, setArtistApplicationStatus] = useState<string | null>(null);
  const [studioAuthState, setStudioAuthState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [studioAuthError, setStudioAuthError] = useState<string | null>(null);
  const [studioAuthAttempt, setStudioAuthAttempt] = useState(0);

  const handleDisconnect = () => {
    disconnect();
    toast.success("Wallet disconnected");
    navigate("/");
  };

  const collectorNavItems = [
    {
      icon: ShoppingBag,
      label: "My Collection",
      desc: "Your collected items",
      path: "/collection",
    },
    {
      icon: Gift,
      label: "My POAPs",
      desc: "Campaign badges & drops",
      path: "/poaps",
    },
    {
      icon: Wallet,
      label: "My Subscriptions",
      desc: "Artists you support",
      path: "/subscriptions",
    },
    {
      icon: ShoppingCart,
      label: "Cart",
      desc: "Review items before checkout",
      path: "/cart",
    },
    {
      icon: Package,
      label: "Track Orders",
      desc: "View purchases and delivery",
      path: "/orders",
    },
    {
      icon: Shield,
      label: "Creator Dashboard",
      desc: "Manage your creator profile",
      path: "/studio",
    },
  ];

  useEffect(() => {
    let active = true;

    const loadArtistState = async () => {
      if (!address || !isConnected) {
        if (active) {
          setArtistApproved(false);
          setArtistApplicationStatus(null);
          setArtistStatusLoading(false);
          setStudioAuthState("idle");
          setStudioAuthError(null);
        }
        return;
      }

      setArtistStatusLoading(true);
      setArtistApproved(isWhitelistedArtistSync(address));

      try {
        const [whitelist, application] = await Promise.all([
          getArtistWhitelist(),
          getArtistApplication(address),
        ]);

        if (!active) return;

        const normalizedAddress = address.toLowerCase();
        const approved = whitelist.some(
          (entry) => entry.wallet.toLowerCase() === normalizedAddress && entry.status === "approved"
        );

        setArtistApproved(approved);
        setArtistApplicationStatus(application?.status ?? null);
      } catch (error) {
        console.error("Failed to load artist collector hub state:", error);
        if (active) {
          setArtistApplicationStatus(null);
        }
      } finally {
        if (active) {
          setArtistStatusLoading(false);
        }
      }
    };

    loadArtistState();

    return () => {
      active = false;
    };
  }, [address, isConnected]);

  useEffect(() => {
    let cancelled = false;

    const authenticateStudio = async () => {
      if (!address || !isConnected || !artistApproved || activeSection !== "studio") {
        if (!cancelled && activeSection !== "studio") {
          setStudioAuthState("idle");
          setStudioAuthError(null);
        }
        return;
      }

      setStudioAuthState("loading");
      setStudioAuthError(null);

      try {
        const session = await establishSecureSession(address);
        if (cancelled) return;

        if (session.role === "artist" || session.role === "admin") {
          setStudioAuthState("ready");
          return;
        }

        setStudioAuthState("error");
        setStudioAuthError("This wallet is connected, but it does not have studio access.");
      } catch (error) {
        if (cancelled) return;
        setStudioAuthState("error");
        setStudioAuthError(error instanceof Error ? error.message : "Failed to open artist studio.");
      }
    };

    authenticateStudio();

    return () => {
      cancelled = true;
    };
  }, [activeSection, address, artistApproved, isConnected, studioAuthAttempt]);

  const desktopNavItems = useMemo(() => {
    const artistLabel = artistApproved ? "Creator Dashboard" : "Apply to Create";
    const artistDesc = artistApproved
      ? "Manage your creator profile"
      : artistApplicationStatus === "pending"
        ? "Application in review"
        : "Apply for creator access";

    return [
      {
        id: "collection" as const,
        icon: ShoppingBag,
        label: "My Collection",
        desc: "Your collected items",
      },
      {
        id: "poaps" as const,
        icon: Gift,
        label: "My POAPs",
        desc: "Campaign badges & drops",
      },
      {
        id: "subscriptions" as const,
        icon: Wallet,
        label: "My Subscriptions",
        desc: "Artists you support",
      },
      {
        id: "studio" as const,
        icon: Shield,
        label: artistLabel,
        desc: artistDesc,
      },
    ];
  }, [artistApplicationStatus, artistApproved]);

  const activeDesktopItem = desktopNavItems.find((item) => item.id === activeSection);

  const renderDesktopPanel = () => {
    if (activeSection === "collection") {
      return <MyCollectionPage embedded />;
    }

    if (activeSection === "poaps") {
      return <MyPOAPsPage embedded />;
    }

    if (activeSection === "subscriptions") {
      return <MySubscriptionsPage embedded />;
    }

    if (!artistApproved) {
      return <ArtistApplicationPage embedded />;
    }

    if (studioAuthState === "loading" || artistStatusLoading) {
      return (
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">Opening artist studio</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Verifying your wallet and preparing the creator workspace.
            </p>
          </div>
        </div>
      );
    }

    if (studioAuthState === "error") {
      return (
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="max-w-md rounded-[1.75rem] border border-[#bfd5ff] bg-[#f3f8ff] p-6 text-center">
            <p className="text-base font-semibold text-foreground">Studio needs wallet verification</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {studioAuthError || "We couldn’t open the studio for this wallet yet."}
            </p>
            <button
              type="button"
              onClick={() => setStudioAuthAttempt((value) => value + 1)}
              className="mt-4 rounded-full bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return <ArtistStudioPage embedded />;
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_30%),linear-gradient(180deg,#f7fbff_0%,#ecf4ff_100%)] px-4 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-white/80 bg-white/92 p-5 shadow-[0_35px_120px_rgba(37,99,235,0.10)] backdrop-blur md:p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#60a5fa_0%,#1d4ed8_100%)] text-white shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-black tracking-tight text-foreground">Collector Hub</p>
                <p className="text-xs text-muted-foreground">Wallet, collection & artist memberships</p>
              </div>
            </div>

            <nav className="space-y-3">
              {collectorNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 rounded-2xl bg-[#f3f8ff] px-4 py-3 transition-colors hover:bg-[#dbeafe]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#d7e7ff]">
                    <item.icon className="h-4 w-4 text-[#1d4ed8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={!isConnected}
              className="mt-8 flex w-full items-center gap-3 rounded-2xl bg-[#fee2e2] px-4 py-3 transition-colors hover:bg-[#fecaca] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#fca5a5]">
                <LogOut className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-red-900">Log Out</p>
                <p className="text-xs text-red-700">Disconnect wallet session</p>
              </div>
            </button>

            {!isConnected && (
              <div className="mt-6 rounded-[1.75rem] border border-dashed border-[#bfd5ff] bg-[#f3f8ff] p-6 text-center">
                <p className="text-sm font-semibold text-foreground">Wallet not connected</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Connect your Base wallet to access your collection, POAPs, subscriptions, and artist studio.
                </p>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-4">
              <p className="text-xs font-semibold text-[#1d4ed8]">Address</p>
              <p className="mt-1 text-xs font-mono text-muted-foreground">{address || "Not connected"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.16),transparent_30%),linear-gradient(180deg,#f7fbff_0%,#ecf4ff_100%)] px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_35px_120px_rgba(37,99,235,0.10)] backdrop-blur">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#60a5fa_0%,#1d4ed8_100%)] text-white shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-black tracking-tight text-foreground">Collector Hub</p>
                <p className="text-xs text-muted-foreground">Desktop wallet, collection & creator access</p>
              </div>
            </div>

            <nav className="space-y-3">
              {desktopNavItems.map((item) => {
                const isActive = item.id === activeSection;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      isActive ? "bg-[#dbeafe]" : "bg-[#f3f8ff] hover:bg-[#e8f1ff]"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#d7e7ff]">
                      <item.icon className="h-4 w-4 text-[#1d4ed8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    {isActive && <Award className="h-4 w-4 text-[#1d4ed8]" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 rounded-[1.5rem] border border-[#dbeafe] bg-[#eff6ff] p-4">
              <p className="text-xs font-semibold text-[#1d4ed8]">Address</p>
              <p className="mt-1 break-all text-xs font-mono text-muted-foreground">{address || "Not connected"}</p>
              {artistApplicationStatus && !artistApproved && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Artist application status: <span className="font-semibold capitalize text-foreground">{artistApplicationStatus}</span>
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                to="/orders"
                className="rounded-[1.3rem] border border-[#dbeafe] bg-[#f3f8ff] px-4 py-3 text-left transition-colors hover:bg-[#e8f1ff]"
              >
                <p className="text-sm font-semibold text-foreground">Orders</p>
                <p className="mt-1 text-xs text-muted-foreground">Track every purchase</p>
              </Link>
              <Link
                to="/cart"
                className="rounded-[1.3rem] border border-[#dbeafe] bg-[#f3f8ff] px-4 py-3 text-left transition-colors hover:bg-[#e8f1ff]"
              >
                <p className="text-sm font-semibold text-foreground">Cart</p>
                <p className="mt-1 text-xs text-muted-foreground">Review releases before checkout</p>
              </Link>
            </div>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={!isConnected}
              className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-[#fee2e2] px-4 py-3 transition-colors hover:bg-[#fecaca] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#fca5a5]">
                <LogOut className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-red-900">Log Out</p>
                <p className="text-xs text-red-700">Disconnect wallet session</p>
              </div>
            </button>
          </aside>

          <section className="min-w-0 rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_35px_120px_rgba(37,99,235,0.10)] backdrop-blur">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black tracking-tight text-foreground">{activeDesktopItem?.label || "Collector Hub"}</p>
                <p className="text-sm text-muted-foreground">
                  {activeDesktopItem?.desc || "Browse your collector activity and creator tools in one place."}
                </p>
              </div>
              {!isConnected && (
                <div className="rounded-full border border-dashed border-[#bfd5ff] bg-[#f3f8ff] px-4 py-2 text-xs font-medium text-muted-foreground">
                  Connect your wallet to unlock this hub
                </div>
              )}
            </div>

            <div className="min-h-[640px] overflow-hidden rounded-[1.75rem] border border-[#e5eefc] bg-white">
              {renderDesktopPanel()}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
