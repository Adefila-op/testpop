import type { ComponentType } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Compass, Flame, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appShellNavItems, isAppShellNavActive } from "@/components/appShellNav";
import type { HomeArtist, HomeDrop, HomeSubscribeButtonProps, HomeToastFn } from "./types";

type DesktopHomeDashboardProps = {
  featuredArtists: HomeArtist[];
  liveDrops: HomeDrop[];
  currentCard: number;
  setCurrentCard: (index: number) => void;
  nextCard: () => void;
  prevCard: () => void;
  isConnected: boolean;
  connectWallet: () => Promise<unknown>;
  address?: string | null;
  toast: HomeToastFn;
  loading: boolean;
  error: Error | null;
  dropsLoading: boolean;
  dropsError: Error | null;
  mintingDropId: string | null;
  isMintingArtist: boolean;
  biddingDropId: string | null;
  isBidding: boolean;
  onCollectDrop: (drop: HomeDrop) => Promise<void> | void;
  onBidOnDrop: (drop: HomeDrop) => Promise<void> | void;
  SubscribeButtonComponent: ComponentType<HomeSubscribeButtonProps>;
};

const formatWalletLabel = (value?: string | null) => {
  if (!value) return "Guest Collector";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const DesktopHomeDashboard = ({
  featuredArtists,
  liveDrops,
  currentCard,
  setCurrentCard,
  nextCard,
  prevCard,
  isConnected,
  connectWallet,
  address,
  toast,
  loading,
  error,
  dropsLoading,
  dropsError,
  mintingDropId,
  isMintingArtist,
  biddingDropId,
  isBidding,
  onCollectDrop,
  onBidOnDrop,
  SubscribeButtonComponent,
}: DesktopHomeDashboardProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeArtist =
    featuredArtists.length > 0
      ? featuredArtists[((currentCard % featuredArtists.length) + featuredArtists.length) % featuredArtists.length]
      : null;
  const artistQueue =
    featuredArtists.length > 0
      ? Array.from({ length: Math.min(4, featuredArtists.length) }, (_, index) => {
          const artistIndex = (currentCard + index) % featuredArtists.length;
          return {
            ...featuredArtists[artistIndex],
            artistIndex,
          };
        })
      : [];
  const queuedArtists = artistQueue.slice(1);
  const featuredDrop = liveDrops[0] ?? null;
  const desktopLiveDrops = liveDrops.slice(0, 3);

  const renderHeroAction = () => {
    if (!featuredDrop) {
      return null;
    }

    if (featuredDrop.type === "auction") {
      return (
        <Button
          onClick={() => onBidOnDrop(featuredDrop)}
          disabled={isBidding || biddingDropId === featuredDrop.id}
          className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-[#171717] hover:bg-white/90"
        >
          {biddingDropId === featuredDrop.id ? "Placing Bid..." : "Place Bid"}
        </Button>
      );
    }

    if (featuredDrop.type === "campaign") {
      return (
        <Button asChild className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-[#171717] hover:bg-white/90">
          <Link to={`/drops/${featuredDrop.id}`}>View Campaign</Link>
        </Button>
      );
    }

    return (
      <Button
        onClick={() => onCollectDrop(featuredDrop)}
        disabled={isMintingArtist || mintingDropId === featuredDrop.id}
        className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-[#171717] hover:bg-white/90"
      >
        {mintingDropId === featuredDrop.id ? "Collecting..." : "Collect Drop"}
      </Button>
    );
  };

  return (
    <div className="hidden md:block">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/30 bg-[linear-gradient(180deg,rgba(170,165,157,0.95)_0%,rgba(118,114,108,0.98)_100%)] p-5 shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
        <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-5">
            <div className="rounded-[2rem] border border-white/20 bg-white/12 p-4 text-white backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/58">Profile Rail</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    {isConnected ? "Collector Dashboard" : "Desktop Preview"}
                  </h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/16 bg-white/12 text-sm font-semibold uppercase">
                  {address ? address.slice(2, 4) : "PU"}
                </div>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-white/14 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/52">Wallet</p>
                <p className="mt-2 text-sm font-medium text-white">{formatWalletLabel(address)}</p>
                <p className="mt-2 text-xs leading-5 text-white/62">
                  Jump between the main surfaces while the home dashboard stays focused on drops and artists.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {appShellNavItems.map((item) => {
                  const isActive = isAppShellNavActive(item.path, location.pathname);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 rounded-[1.35rem] px-4 py-3 text-sm transition-colors ${
                        isActive
                          ? "bg-white text-[#141414]"
                          : "bg-white/10 text-white/78 hover:bg-white/14 hover:text-white"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/20 bg-white/10 p-4 text-white backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">Artist Deck</p>
                  <h3 className="mt-2 text-xl font-semibold">Rendered for desktop</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevCard}
                    disabled={featuredArtists.length < 2}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/16 bg-white/10 text-white transition-colors hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextCard}
                    disabled={featuredArtists.length < 2}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/16 bg-white/10 text-white transition-colors hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="mt-4 rounded-[1.6rem] border border-dashed border-white/20 bg-black/10 p-6 text-center text-sm text-white/70">
                  Loading artists...
                </div>
              ) : error ? (
                <div className="mt-4 rounded-[1.6rem] border border-dashed border-[#fecaca] bg-[#7f1d1d]/25 p-6 text-sm text-[#fee2e2]">
                  {error.message}
                </div>
              ) : activeArtist ? (
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/artists/${activeArtist.id}`)}
                    className="block w-full overflow-hidden rounded-[1.8rem] border border-white/16 bg-black/12 text-left"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img src={activeArtist.cover || activeArtist.avatar} alt={activeArtist.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.14)_0%,rgba(8,8,8,0.74)_100%)]" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="text-[10px] uppercase tracking-[0.26em] text-white/65">{activeArtist.tag}</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{activeArtist.name}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/72">{activeArtist.bio}</p>
                      </div>
                    </div>
                  </button>

                  <div className="space-y-2">
                    {queuedArtists.map((artist, index) => (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => setCurrentCard(artist.artistIndex)}
                        className="flex w-full items-center gap-3 rounded-[1.35rem] border border-white/14 bg-white/10 px-3 py-3 text-left text-white transition-colors hover:bg-white/14"
                      >
                        <div className="h-14 w-14 overflow-hidden rounded-[1rem] bg-black/15">
                          <img src={artist.avatar || artist.cover} alt={artist.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{artist.name}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/55">
                            {index === 0 ? "Up Next" : "On Deck"}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-white/58" />
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[1.5rem] border border-white/14 bg-white/8 p-3">
                    <div className="flex gap-2">
                      {featuredArtists.map((artist, index) => (
                        <button
                          key={artist.id}
                          type="button"
                          onClick={() => setCurrentCard(index)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            index === currentCard ? "w-8 bg-white" : "w-2 bg-white/35"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.6rem] border border-dashed border-white/20 bg-black/10 p-6 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-white/70" />
                  <p className="mt-3 text-sm font-medium text-white">No artists published yet</p>
                </div>
              )}
            </div>

            {activeArtist && (
              <div className="rounded-[2rem] border border-white/20 bg-white/12 p-4 text-white backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-[1.25rem] border border-white/14">
                    <img src={activeArtist.avatar || activeArtist.cover} alt={activeArtist.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Featured Artist</p>
                    <p className="mt-1 truncate text-lg font-semibold">{activeArtist.name}</p>
                    <p className="truncate text-xs text-white/58">{activeArtist.tag}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <SubscribeButtonComponent
                    artist={activeArtist}
                    isConnected={isConnected}
                    connectWallet={connectWallet}
                    address={address}
                    toast={toast}
                    className="flex-1 bg-white text-[#171717] hover:bg-white/90"
                  />
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-full border-white/16 bg-white/10 px-4 text-white hover:bg-white/16 hover:text-white"
                  >
                    <Link to={`/artists/${activeArtist.id}`}>Profile</Link>
                  </Button>
                </div>
              </div>
            )}
          </aside>

          <div className="flex min-w-0 flex-col gap-5">
            <section className="relative overflow-hidden rounded-[2.2rem] border border-white/20 bg-[#111111] shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
              {featuredDrop ? (
                <>
                  <div className="absolute inset-0">
                    {featuredDrop.image ? (
                      <img src={featuredDrop.image} alt={featuredDrop.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#1f2937_0%,#0f172a_100%)] text-sm font-semibold uppercase tracking-[0.28em] text-white/75">
                        {featuredDrop.assetType || "Featured Drop"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,12,12,0.88)_0%,rgba(12,12,12,0.48)_45%,rgba(12,12,12,0.16)_100%)]" />
                  </div>

                  <div className="relative grid min-h-[430px] gap-6 p-8 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full border-0 bg-white/14 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white">
                            Featured Drop
                          </Badge>
                          <Badge className="rounded-full border-0 bg-[#ffedd5] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#9a3412]">
                            Live Now
                          </Badge>
                          <Badge className="rounded-full border-0 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/75">
                            {featuredDrop.type}
                          </Badge>
                        </div>

                        <p className="mt-10 text-[11px] uppercase tracking-[0.28em] text-white/56">Top Frame</p>
                        <h1 className="mt-4 max-w-2xl text-[clamp(2.6rem,5vw,4rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-white">
                          {featuredDrop.title}
                        </h1>
                        <p className="mt-4 max-w-xl text-base leading-7 text-white/70">
                          A desktop-first spotlight that puts the drop at center stage, keeps profile navigation in reach,
                          and lets the artist deck drive discovery without taking over the hero.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {renderHeroAction()}
                        <Button
                          asChild
                          variant="outline"
                          className="h-12 rounded-full border-white/16 bg-white/8 px-6 text-sm font-semibold text-white hover:bg-white/14 hover:text-white"
                        >
                          <Link to={`/drops/${featuredDrop.id}`}>Open Drop</Link>
                        </Button>
                        <div className="rounded-full border border-white/14 bg-white/8 px-4 py-3 text-sm text-white/74">
                          {featuredDrop.priceEth} ETH
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-[1.8rem] border border-white/14 bg-white/10 p-5 text-white backdrop-blur-md">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-white/52">Quick Read</p>
                        <div className="mt-4 space-y-4">
                          <div className="rounded-[1.4rem] bg-black/14 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-white/52">Artist</p>
                            <p className="mt-2 text-lg font-semibold">{featuredDrop.artist}</p>
                          </div>
                          <div className="rounded-[1.4rem] bg-black/14 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-white/52">Ends In</p>
                            <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                              <Clock className="h-4 w-4 text-white/60" />
                              {featuredDrop.endsIn}
                            </p>
                          </div>
                          {activeArtist && (
                            <button
                              type="button"
                              onClick={() => navigate(`/artists/${activeArtist.id}`)}
                              className="flex w-full items-center gap-3 rounded-[1.4rem] bg-black/14 p-3 text-left transition-colors hover:bg-black/18"
                            >
                              <div className="h-14 w-14 overflow-hidden rounded-[1rem]">
                                <img src={activeArtist.avatar || activeArtist.cover} alt={activeArtist.name} className="h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.22em] text-white/52">Artist Deck Lead</p>
                                <p className="mt-1 truncate text-sm font-semibold">{activeArtist.name}</p>
                                <p className="truncate text-xs text-white/56">{activeArtist.tag}</p>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>

                      <Link
                        to="/drops"
                        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white/74 transition-colors hover:text-white"
                      >
                        Browse all drops <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[430px] items-center justify-center p-8 text-white">
                  <div className="max-w-md text-center">
                    <Flame className="mx-auto h-10 w-10 text-white/70" />
                    <p className="mt-4 text-2xl font-semibold">No live featured drop yet</p>
                    <p className="mt-3 text-sm leading-6 text-white/65">
                      Once an approved artist publishes a live release, this top frame becomes the cinematic spotlight.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[2.2rem] border border-white/20 bg-white/12 p-5 text-white backdrop-blur-xl">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">Down Frame</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">Live Drops</h2>
                </div>
                <Link
                  to="/drops"
                  className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-medium text-white/78 transition-colors hover:bg-white/16 hover:text-white"
                >
                  <Compass className="h-4 w-4" />
                  See all
                </Link>
              </div>

              {dropsLoading ? (
                <div className="mt-5 rounded-[1.8rem] border border-dashed border-white/20 bg-black/10 p-8 text-center text-sm text-white/70">
                  Loading live drops...
                </div>
              ) : dropsError ? (
                <div className="mt-5 rounded-[1.8rem] border border-dashed border-[#fecaca] bg-[#7f1d1d]/25 p-8 text-sm text-[#fee2e2]">
                  {dropsError.message}
                </div>
              ) : desktopLiveDrops.length > 0 ? (
                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  {desktopLiveDrops.map((drop) => (
                    <article
                      key={drop.id}
                      className="overflow-hidden rounded-[1.8rem] border border-white/14 bg-black/14 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                    >
                      <div className="relative aspect-[1.08] overflow-hidden">
                        {drop.image ? (
                          <img src={drop.image} alt={drop.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#1f2937_0%,#0f172a_100%)] text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                            {drop.assetType || "digital"}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.02)_10%,rgba(10,10,10,0.52)_100%)]" />
                        <Badge className="absolute left-4 top-4 rounded-full border-0 bg-white/14 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white">
                          {drop.type}
                        </Badge>
                      </div>

                      <div className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold">{drop.title}</p>
                            <p className="truncate text-sm text-white/62">{drop.artist}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{drop.priceEth} ETH</p>
                            <p className="mt-1 text-xs text-white/52">{drop.endsIn}</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            asChild
                            variant="outline"
                            className="h-10 flex-1 rounded-full border-white/14 bg-white/8 text-white hover:bg-white/14 hover:text-white"
                          >
                            <Link to={`/drops/${drop.id}`}>Open</Link>
                          </Button>

                          {drop.type === "auction" ? (
                            <Button
                              onClick={() => onBidOnDrop(drop)}
                              disabled={isBidding || biddingDropId === drop.id}
                              className="h-10 flex-1 rounded-full bg-white text-[#171717] hover:bg-white/90"
                            >
                              {biddingDropId === drop.id ? "Bidding..." : "Bid"}
                            </Button>
                          ) : drop.type === "campaign" ? (
                            <Button asChild className="h-10 flex-1 rounded-full bg-white text-[#171717] hover:bg-white/90">
                              <Link to={`/drops/${drop.id}`}>View</Link>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => onCollectDrop(drop)}
                              disabled={isMintingArtist || mintingDropId === drop.id}
                              className="h-10 flex-1 rounded-full bg-white text-[#171717] hover:bg-white/90"
                            >
                              {mintingDropId === drop.id ? "Collecting..." : "Collect"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.8rem] border border-dashed border-white/20 bg-black/10 p-8 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-white/68" />
                  <p className="mt-3 text-sm font-medium text-white">No live drops right now</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DesktopHomeDashboard;
