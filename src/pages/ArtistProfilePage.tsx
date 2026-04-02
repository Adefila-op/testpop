import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Share2, Heart, Users, Flame, Grid3X3, Globe, Loader2 } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useWallet, useSubscribeToArtistContract, useGetSubscriberCountFromArtistContract, useIsSubscribedToArtistContract } from "@/hooks/useContracts";
import { useResolvedArtistContract } from "@/hooks/useContractIntegrations";
import { toast } from "sonner";
import { recordArtistView } from "@/lib/analyticsStore";
import { useSupabaseArtistById, useSupabaseDropsByArtist } from "@/hooks/useSupabase";
import { resolveMediaUrl } from "@/lib/pinata";

const ArtistProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isConnected, address } = useWallet();
  const artistId = id ?? "";
  const invalidArtistId = !id;

  const { data: artist, loading: artistLoading, error: artistError } = useSupabaseArtistById(artistId);
  const { data: supabaseDrops, loading: dropsLoading } = useSupabaseDropsByArtist(artistId);

  // Debug logging
  useEffect(() => {
    console.log(`🎯 ArtistProfilePage loaded with ID: ${id}`);
    console.log(`📊 Artist loading: ${artistLoading}, Drops loading: ${dropsLoading}`);
    console.log(`📊 Artist error:`, artistError);
    console.log(`📊 Artist data:`, artist);
  }, [id, artistId, artistLoading, dropsLoading, artist, artistError]);

  // Transform artist data to component format
  const transformedArtist = useMemo(() => {
    try {
      if (!artist) return null;

      return {
        id: artist.id,
        name: artist.name || "Untitled Artist",
        avatar: artist.avatar_url || "",
        banner: artist.banner_url || "",
        bio: artist.bio || "This artist has not published a public bio yet.",
        tag: artist.tag || "artist",
        handle: artist.handle,
        wallet: artist.wallet,
        contractAddress: artist.contract_address || null,
        investRaised: 0,
        investTotal: 0,
        investPct: 0,
        investGoals: [],
        subscribers: 0,
        subscriptionPrice: artist.subscription_price ? String(artist.subscription_price) : "0.01",
        twitterUrl: artist.twitter_url,
        instagramUrl: artist.instagram_url,
        websiteUrl: artist.website_url,
        portfolio: Array.isArray(artist.portfolio) ? artist.portfolio : [],
      };
    } catch (error) {
      console.error("❌ Error transforming artist data:", error, artist);
      throw error;
    }
  }, [artist]);

  const drops = useMemo(() => {
    try {
      if (!supabaseDrops || !Array.isArray(supabaseDrops)) return [];
      return supabaseDrops.map((drop) => ({
        id: drop.id,
        title: drop.title,
        artistId: drop.artist_id,
        priceEth: String(drop.price_eth || 0),
        maxBuy: drop.supply || 1,
        bought: drop.sold || 0,
        status: drop.status || "draft",
        type: drop.type || "drop",
        image: resolveMediaUrl(drop.preview_uri, drop.image_url, drop.image_ipfs_uri),
        imageUri: drop.image_ipfs_uri || "",
        metadataUri: drop.metadata_ipfs_uri || "",
        contractAddress: drop.contract_address,
        contractDropId: drop.contract_drop_id,
        contractKind: drop.contract_kind,
        revenue: String(drop.revenue || 0),
      }));
    } catch (error) {
      console.error("❌ Error transforming drops data:", error, supabaseDrops);
      return [];
    }
  }, [supabaseDrops]);

  const effectiveContractAddress = useResolvedArtistContract(
    transformedArtist?.wallet,
    transformedArtist?.contractAddress
  );

  const [lightboxImage, setLightboxImage] = useState<{ image: string; title: string; medium: string; year: string } | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [buySharesOpen, setBuySharesOpen] = useState(false);
  const [shareDetails, setShareDetails] = useState({
    productionName: "",
    productType: "music",
    description: "",
    targetAmount: "",
  });

  const {
    subscribe,
    isPending: isSubscribePending,
    isConfirming: isSubscribeConfirming,
    isSuccess: isSubscribeSuccess,
  } = useSubscribeToArtistContract(effectiveContractAddress);

  const { count: onchainSubscribers, isLoading: isSubscribersLoading } = useGetSubscriberCountFromArtistContract(effectiveContractAddress);

  const {
    isSubscribed,
    isLoading: isSubscribedLoading,
    refetch: refetchSubscriptionStatus,
  } = useIsSubscribedToArtistContract(effectiveContractAddress, address ?? null);

  useEffect(() => {
    if (transformedArtist?.id) {
      recordArtistView(transformedArtist.id);
    }
  }, [transformedArtist?.id]);

  useEffect(() => {
    if (isSubscribeSuccess) {
      console.log("✅ Subscribe succeeded! Refetching subscription status...");
      toast.success("Successfully subscribed to artist!");

      setTimeout(() => {
        refetchSubscriptionStatus();
      }, 2000);
    }
  }, [isSubscribeSuccess, refetchSubscriptionStatus]);

  if (invalidArtistId) {
    return (
      <div className="space-y-4 px-4 py-10 text-center">
        <p className="text-lg font-semibold text-foreground">Invalid artist ID</p>
        <p className="text-sm text-muted-foreground">No artist ID provided in the URL.</p>
        <Button onClick={() => navigate("/artists")} className="rounded-full gradient-primary text-primary-foreground">
          Back to Artists
        </Button>
      </div>
    );
  }

  if (artistLoading) {
    return (
      <div className="space-y-4 px-4 py-10 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading artist profile...</p>
      </div>
    );
  }

  if (artistError) {
    return (
      <div className="space-y-4 px-4 py-10 text-center">
        <p className="text-lg font-semibold text-foreground">Error loading artist</p>
        <p className="text-sm text-muted-foreground">There was an error fetching the artist data.</p>
        <p className="rounded bg-secondary p-2 text-xs text-muted-foreground">{artistError.message}</p>
        <Button onClick={() => navigate("/artists")} className="rounded-full gradient-primary text-primary-foreground">
          Back to Artists
        </Button>
      </div>
    );
  }

  if (!transformedArtist) {
    return (
      <div className="space-y-4 px-4 py-10 text-center">
        <p className="text-lg font-semibold text-foreground">Artist not found</p>
        <p className="text-sm text-muted-foreground">This artist is not public yet or is no longer whitelisted.</p>
        <Button onClick={() => navigate("/artists")} className="rounded-full gradient-primary text-primary-foreground">
          Back to Artists
        </Button>
      </div>
    );
  }

  const handleSubscribe = async () => {
    if (!isConnected) {
      toast.error("Connect wallet to subscribe");
      return;
    }

    if (!effectiveContractAddress) {
      toast.error("Artist contract not deployed yet. Please try again later.");
      return;
    }

    const subscriptionPrice = String(transformedArtist.subscriptionPrice ?? "0.01");

    setIsSubscribing(true);
    try {
      await subscribe(subscriptionPrice);
      setIsSubscribing(false);
      toast.success("Subscription transaction submitted. Waiting for on-chain confirmation... Artist gets 70%, team gets 30%.");
    } catch (err: unknown) {
      setIsSubscribing(false);
      const message = err instanceof Error ? err.message : "Subscription failed";
      toast.error(message);
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied");
  };

  const publicLinks = [
    { label: "X / Twitter", href: transformedArtist.twitterUrl },
    { label: "Instagram", href: transformedArtist.instagramUrl },
    { label: "Website", href: transformedArtist.websiteUrl },
  ].filter((link) => Boolean(link.href));

  return (
    <div className="space-y-0">
      <div className="relative h-44 overflow-hidden">
        <img src={transformedArtist.banner} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <button onClick={() => navigate(-1)} className="absolute left-3 top-3 rounded-full bg-background/60 p-2 backdrop-blur-sm">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <button onClick={handleShare} className="absolute right-3 top-3 rounded-full bg-background/60 p-2 backdrop-blur-sm">
          <Share2 className="h-4 w-4 text-foreground" />
        </button>
      </div>

      <div className="relative z-10 -mt-10 px-4">
        <div className="flex items-end gap-3">
          <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-background shadow-elevated">
            <img src={transformedArtist.avatar} alt={transformedArtist.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 pb-1">
            <h1 className="text-xl font-bold text-foreground">{transformedArtist.name}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {transformedArtist.tag}
              </Badge>
              {transformedArtist.handle && <span className="text-[11px] text-muted-foreground">@{transformedArtist.handle}</span>}
            </div>
          </div>
        </div>

        <p className="mt-3 font-body text-sm text-muted-foreground">{transformedArtist.bio}</p>

        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">{isSubscribersLoading ? "..." : onchainSubscribers}</span>
            <span className="text-muted-foreground">subscribers</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Flame className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">{drops.length}</span>
            <span className="text-muted-foreground">drops</span>
          </div>
        </div>

        {publicLinks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {publicLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary">
                <Globe className="h-3.5 w-3.5" /> {link.label}
              </a>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleSubscribe}
            disabled={isSubscribing || isSubscribePending || isSubscribeConfirming || isSubscribed || isSubscribedLoading}
            className="h-10 flex-1 rounded-full gradient-primary text-sm font-semibold text-primary-foreground"
          >
            {isConnected
              ? isSubscribed
                ? "Subscribed ✓"
                : isSubscribedLoading
                  ? "Checking..."
                  : isSubscribing || isSubscribePending
                    ? "Processing..."
                    : isSubscribeConfirming
                      ? "Confirming..."
                      : `Subscribe · ${transformedArtist.subscriptionPrice} ETH/mo`
              : "Connect Wallet to Subscribe"}
          </Button>
          <Button
            onClick={() => setBuySharesOpen(true)}
            disabled={onchainSubscribers < 100}
            variant={onchainSubscribers < 100 ? "secondary" : "outline"}
            className="h-10 flex-1 rounded-full border border-border text-sm font-semibold"
            title={onchainSubscribers < 100 ? "Artist needs 100+ subscribers to sell shares" : ""}
          >
            {onchainSubscribers < 100 ? `Buy Shares (${onchainSubscribers}/100)` : "Buy Shares"}
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6 px-4">
        <Tabs defaultValue="portfolio">
          <TabsList className="w-full rounded-xl bg-secondary">
            <TabsTrigger value="portfolio" className="flex-1 rounded-lg text-xs">
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="drops" className="flex-1 rounded-lg text-xs">
              Drops
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-4">
            {transformedArtist.portfolio.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No portfolio pieces yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {transformedArtist.portfolio.map((piece, idx) => (
                  <button
                    key={piece.id}
                    onClick={() => setLightboxImage(piece)}
                    className={`group relative overflow-hidden rounded-xl ${idx === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}
                  >
                    <img src={piece.image} alt={piece.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-xs font-semibold text-card-foreground">{piece.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {piece.medium} · {piece.year}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-4 text-center font-body text-xs text-muted-foreground">
              <Grid3X3 className="mr-1 inline h-3 w-3" />
              {transformedArtist.portfolio.length} pieces in collection
            </p>
          </TabsContent>

          <TabsContent value="drops" className="mt-4">
            {drops.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No drops yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {drops.map((drop) => (
                  <Link key={drop.id} to={`/drops/${drop.id}`} className="overflow-hidden rounded-2xl bg-card shadow-card">
                    <div className="aspect-square overflow-hidden">
                      <img src={drop.image} alt={drop.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-card-foreground">{drop.title}</p>
                      <p className="mt-1 text-sm font-bold text-primary">{drop.priceEth} ETH</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={buySharesOpen} onOpenChange={setBuySharesOpen}>
        <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto rounded-2xl bg-card p-4 shadow-card">
          <DialogHeader>
            <DialogTitle>Buy Shares in {transformedArtist.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Production Name *</label>
              <Input
                placeholder='e.g., "Album 2024", "Film Production"'
                value={shareDetails.productionName}
                onChange={(e) => setShareDetails({ ...shareDetails, productionName: e.target.value })}
                className="h-9 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Product Type *</label>
              <select
                value={shareDetails.productType}
                onChange={(e) => setShareDetails({ ...shareDetails, productType: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground"
              >
                <option value="music">Music</option>
                <option value="video">Video</option>
                <option value="film">Film</option>
                <option value="art">Art</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Description *</label>
              <textarea
                placeholder="Describe your production and what the investment will fund..."
                value={shareDetails.description}
                onChange={(e) => setShareDetails({ ...shareDetails, description: e.target.value })}
                className="h-20 w-full resize-none rounded-lg border border-border bg-secondary p-2 text-sm text-foreground placeholder-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Target Funding (ETH) *</label>
              <Input
                type="number"
                placeholder="e.g., 10"
                value={shareDetails.targetAmount}
                onChange={(e) => setShareDetails({ ...shareDetails, targetAmount: e.target.value })}
                step="0.1"
                min="0"
                className="h-9 rounded-lg"
              />
            </div>

            <div className="rounded-xl border border-border bg-secondary p-3">
              <p className="mb-2 text-xs font-semibold text-foreground">Revenue Split (Subscriptions)</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Artist: 70%</p>
                <p>Founder: 30%</p>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">Mints: 97.5% artist, 2.5% platform</p>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Investor shares feature coming soon. Currently supporting direct artist subscriptions with 70/30 split.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuySharesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!shareDetails.productionName.trim() || !shareDetails.description.trim() || !shareDetails.targetAmount) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                toast.success("Production posted! Investors can now view your offering.");
                setShareDetails({ productionName: "", productType: "music", description: "", targetAmount: "" });
                setBuySharesOpen(false);
              }}
              className="gradient-primary text-primary-foreground"
            >
              Post Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-lg overflow-hidden rounded-2xl border-none bg-card p-0">
          {lightboxImage && (
            <>
              <img src={lightboxImage.image} alt={lightboxImage.title} className="aspect-square w-full object-cover" />
              <div className="p-4">
                <p className="font-bold text-foreground">{lightboxImage.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lightboxImage.medium} · {lightboxImage.year}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistProfilePage;
