import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  LogOut,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import WalletConnect from "@/components/WalletConnect";
import { useWallet } from "@/hooks/useContracts";
import { formatEther, createPublicClient, getAddress, http } from "viem";
import { toast } from "sonner";
import { useSupabaseArtists, useSupabaseOrdersByBuyer } from "@/hooks/useSupabase";
import { useCollectionStore } from "@/stores/collectionStore";
import { ACTIVE_CHAIN } from "@/lib/wagmi";
import { ARTIST_DROP_ABI } from "@/lib/contracts/artDropArtist";
import type { OrderWithItems } from "@/lib/db";
import { fetchResolvedArtistContractAddress } from "@/hooks/useContractIntegrations";

function getAvatarColor(address?: string): string {
  if (!address) return "#8884d8";
  const hash = address.toLowerCase().substring(2);
  const colors = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  ];
  return colors[parseInt(hash.substring(0, 2), 16) % colors.length];
}

function getInitials(address?: string) {
  return address ? address.substring(2, 4).toUpperCase() : "?";
}

const ProfilePage = () => {
  const { address, isConnected, chain, balance, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);
  const [activeSubscriptionCount, setActiveSubscriptionCount] = useState(0);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const { data: artists } = useSupabaseArtists();
  const { data: orders } = useSupabaseOrdersByBuyer(address?.toLowerCase());
  const collection = useCollectionStore((state) => state.items);

  useEffect(() => {
    if (!isConnected || !address || !artists.length) {
      setActiveSubscriptionCount(0);
      setSubscriptionsLoading(false);
      return;
    }

    let active = true;
    const loadSubscriptions = async () => {
      setSubscriptionsLoading(true);
      try {
        const publicClient = createPublicClient({ chain: ACTIVE_CHAIN, transport: http() });
        const userAddress = getAddress(address);

        const results = await Promise.all(
          artists.map(async (artist) => {
            try {
              const contractAddress = await fetchResolvedArtistContractAddress(
                publicClient,
                artist.wallet,
                artist.contract_address
              );

              if (!contractAddress) {
                return false;
              }

              return await publicClient.readContract({
                address: getAddress(contractAddress),
                abi: ARTIST_DROP_ABI,
                functionName: "isSubscriptionActive",
                args: [userAddress],
              });
            } catch {
              return false;
            }
          })
        );

        if (!active) return;
        setActiveSubscriptionCount(results.filter(Boolean).length);
      } finally {
        if (active) {
          setSubscriptionsLoading(false);
        }
      }
    };

    void loadSubscriptions();

    return () => {
      active = false;
    };
  }, [address, artists, isConnected]);

  const ownedCollectionCount = useMemo(() => {
    if (!address) return 0;

    const normalizedAddress = address.toLowerCase();
    const localCount = collection.filter((item) => item.ownerWallet.toLowerCase() === normalizedAddress).length;
    const orderCount = (orders || []).reduce((total, order) => {
      const typedOrder = order as OrderWithItems;
      if (typedOrder.order_items?.length) {
        return total + typedOrder.order_items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
      }
      return total + Math.max(1, Number(typedOrder.quantity) || 1);
    }, 0);

    return Math.max(localCount, orderCount);
  }, [address, collection, orders]);

  const liveStats = useMemo(
    () => [
      {
        label: "Collection",
        value: String(ownedCollectionCount),
        tone: "bg-[#e9f3ff] text-[#0f4fa8]",
      },
      {
        label: "Subscriptions",
        value: subscriptionsLoading ? "..." : String(activeSubscriptionCount),
        tone: "bg-[#dcecff] text-[#11418d]",
      },
      {
        label: "Orders",
        value: String(orders?.length || 0),
        tone: "bg-[#f1f7ff] text-[#2a5fa8]",
      },
    ],
    [activeSubscriptionCount, orders?.length, ownedCollectionCount, subscriptionsLoading]
  );

  const menuItems = useMemo(
    () => [
      {
        icon: ShoppingBag,
        label: "My Collection",
        desc: "Open the collectibles and ebooks you own",
        link: "/collection",
      },
      {
        icon: Award,
        label: "My POAPs",
        desc: "Campaign badges, access passes, and drops",
        link: "/poaps",
      },
      {
        icon: Wallet,
        label: "Subscriptions",
        desc: "Artists and memberships you actively support",
        link: "/subscriptions",
      },
      {
        icon: Shield,
        label: "Artist Studio",
        desc: "Manage drops, profile, and portfolio if approved",
        link: "/studio",
      },
    ],
    []
  );

  const quickStats = [
    {
      label: "Wallet Status",
      value: isConnected ? "Connected" : "Offline",
      tone: "bg-[#e8f2ff] text-[#0f4fa8]",
    },
    {
      label: "Network",
      value: chain?.name || "Not connected",
      tone: "bg-[#dcebff] text-[#15458f]",
    },
    {
      label: "Balance",
      value: balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ETH` : "Waiting",
      tone: "bg-[#f3f8ff] text-[#2a5fa8]",
    },
  ];

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success("Wallet disconnected");
  };

  return (
    <div className="min-h-[calc(100vh-88px)] bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_30%),linear-gradient(180deg,#f7fbff_0%,#ecf4ff_100%)] px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/80 bg-white/92 p-3 shadow-[0_35px_120px_rgba(37,99,235,0.10)] backdrop-blur md:p-5">
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[1.8rem] border border-[#cfe0ff] bg-[linear-gradient(180deg,#f9fcff_0%,#eef5ff_100%)] p-5 shadow-[inset_-1px_0_0_rgba(37,99,235,0.06)]">
            <div className="flex items-center gap-3 md:block">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#60a5fa_0%,#1d4ed8_100%)] text-white shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="md:mt-4">
                <p className="text-lg font-black tracking-tight text-foreground">Collector Hub</p>
                <p className="text-xs text-muted-foreground">Wallet, access, library, and support tools</p>
              </div>
            </div>

            <nav className="mt-8 space-y-2">
              {menuItems.map((item, index) => (
                <Link
                  key={item.label}
                  to={item.link}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                    index === 0 ? "bg-[#dbeafe] text-foreground shadow-sm" : "hover:bg-[#eaf3ff]"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#d7e7ff]">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={!isConnected}
              className="mt-8 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-[#eaf3ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#d7e7ff]">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Log Out</p>
                <p className="text-xs text-muted-foreground">Disconnect current wallet session</p>
              </div>
            </button>
          </aside>

          <section className="rounded-[1.8rem] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_100%)] p-4 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl flex-1 rounded-[1.4rem] border border-[#dbe7ff] bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Live Summary</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {liveStats.map((stat) => (
                    <span key={stat.label} className={`rounded-full px-3 py-1 text-xs font-semibold ${stat.tone}`}>
                      {stat.label}: {stat.value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 self-start rounded-full border border-[#dbe7ff] bg-white px-3 py-2 shadow-sm md:self-end">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(address) }}
                >
                  {getInitials(address)}
                </div>
                <div className="pr-1">
                  <p className="text-sm font-semibold text-foreground">{isConnected ? "Connected Collector" : "Guest Collector"}</p>
                  <p className="text-xs text-muted-foreground">{chain?.name || "Connect a wallet to personalize"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">My Profile</h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      Review your wallet identity, library access, and the areas where you collect, support artists, and open owned content.
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-[#dbe7ff] bg-white p-2 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                    title="Settings coming soon"
                    disabled
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <span className="font-semibold text-foreground">Overview</span>
                  <span className="text-muted-foreground">Library</span>
                  <span className="text-muted-foreground">Support</span>
                  <span className="text-muted-foreground">Activity</span>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="grid gap-3 rounded-[1.75rem] border border-[#dbe7ff] bg-white p-4 shadow-[0_20px_45px_rgba(37,99,235,0.06)] md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,#60a5fa_0%,#2563eb_100%)] p-4 shadow-inner">
                      <div
                        className="mx-auto flex h-36 w-full max-w-[180px] items-center justify-center rounded-[1.2rem] bg-white/15 text-white shadow-[0_16px_40px_rgba(37,99,235,0.18)]"
                        style={{ backgroundColor: `${getAvatarColor(address)}33` }}
                      >
                        <div
                          className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-black text-white ring-4 ring-white/70"
                          style={{ backgroundColor: getAvatarColor(address) }}
                        >
                          {getInitials(address)}
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 p-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xl font-bold text-foreground">Collector Identity</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Manage the wallet used for your collection, POAP access, and protected ebook content.
                          </p>
                        </div>
                        <div className="rounded-full bg-[#dbeafe] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                          {isConnected ? "Active" : "Offline"}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {quickStats.map((stat) => (
                          <div key={stat.label} className={`rounded-full px-3 py-1 text-xs font-semibold ${stat.tone}`}>
                            {stat.label}: {stat.value}
                          </div>
                        ))}
                      </div>

                      {isConnected ? (
                        <>
                          <div className="mt-4 rounded-2xl bg-[#f3f8ff] p-3 ring-1 ring-[#dbe7ff]">
                            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Wallet Address</p>
                            <div className="mt-2 flex items-center gap-2">
                              <p className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">{address}</p>
                              <button
                                onClick={copyAddress}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-foreground shadow-sm ring-1 ring-[#dbe7ff] transition-colors hover:bg-[#eef5ff]"
                              >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <Button asChild className="rounded-full gradient-primary text-primary-foreground">
                              <Link to="/collection">Open My Collection</Link>
                            </Button>
                            <Button variant="outline" className="rounded-full" onClick={handleDisconnect}>
                              Disconnect
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="mt-5 rounded-2xl bg-[#f3f8ff] p-4 ring-1 ring-[#dbe7ff]">
                          <p className="text-sm text-muted-foreground">Connect your Base wallet to unlock your collection, owned ebooks, subscriptions, and POAPs.</p>
                          <div className="mt-4">
                            <WalletConnect />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Link to="/collection" className="rounded-[1.6rem] border border-[#dbe7ff] bg-white p-4 shadow-[0_18px_40px_rgba(37,99,235,0.06)] transition-transform hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2b63c0]">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-lg font-semibold text-foreground">Collection Library</p>
                      <p className="mt-1 text-sm text-muted-foreground">{ownedCollectionCount} owned item{ownedCollectionCount === 1 ? "" : "s"} available across your collection and order history.</p>
                    </Link>

                    <Link to="/subscriptions" className="rounded-[1.6rem] border border-[#dbe7ff] bg-white p-4 shadow-[0_18px_40px_rgba(37,99,235,0.06)] transition-transform hover:-translate-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dbeafe] text-[#2563eb]">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-lg font-semibold text-foreground">Support Dashboard</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {subscriptionsLoading ? "Checking active artist memberships..." : `Tracking ${activeSubscriptionCount} active subscription${activeSubscriptionCount === 1 ? "" : "s"}.`}
                      </p>
                    </Link>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-[1.6rem] border border-[#dbe7ff] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_100%)] p-4 shadow-[0_18px_40px_rgba(37,99,235,0.06)]">
                      <p className="text-sm font-semibold text-foreground">Reading Access</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Owned EPUB and PDF collectibles open directly inside your library with in-app reading and a safe fallback when a source cannot render.
                      </p>
                      <Button asChild variant="outline" className="mt-4 rounded-full bg-white">
                        <Link to="/collection">Open Library</Link>
                      </Button>
                    </div>

                    <div className="rounded-[1.6rem] border border-[#dbe7ff] bg-white p-4 shadow-[0_18px_40px_rgba(37,99,235,0.06)]">
                      <p className="text-sm font-semibold text-foreground">Collector Activity</p>
                      <p className="mt-2 text-3xl font-black text-[#1d4ed8]">{orders?.length || 0}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Recorded orders tied to your current wallet and available for collection access.
                      </p>
                    </div>

                    <div className="rounded-[1.6rem] border border-[#dbe7ff] bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_100%)] p-4 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
                      <p className="text-sm font-semibold text-foreground">Desktop Flow</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Navigation stays in the left rail while the main canvas stays focused on identity, ownership, and reading access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
