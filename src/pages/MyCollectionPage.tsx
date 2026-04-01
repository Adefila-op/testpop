import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Grid3X3, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useContracts";
import { trackCollectionView } from "@/lib/analyticsStore";
import { ImageViewer, VideoViewer, AudioPlayer, PdfReader, EpubReader, DownloadPanel } from "@/components/collection";
import { ipfsToHttp } from "@/lib/pinata";
import { useCollectionStore, type CollectedDropItem } from "@/stores/collectionStore";
import { fetchAllArtistsFromSupabase, fetchAllDropsFromSupabase } from "@/lib/supabaseStore";
import { createPublicClient, getAddress, http } from "viem";
import { ACTIVE_CHAIN } from "@/lib/wagmi";

const artMintedEvent = {
  type: "event" as const,
  name: "ArtMinted" as const,
  inputs: [
    { name: "dropId", type: "uint256", indexed: true },
    { name: "tokenId", type: "uint256", indexed: true },
    { name: "collector", type: "address", indexed: true },
  ],
};

function getCollectionItemKey(item: CollectedDropItem) {
  const normalizedWallet = item.ownerWallet.toLowerCase();
  const normalizedContract = item.contractAddress?.toLowerCase();

  if (normalizedContract && item.mintedTokenId !== null && item.mintedTokenId !== undefined) {
    return `${normalizedWallet}:${normalizedContract}:${item.mintedTokenId}`;
  }

  return `${normalizedWallet}:${item.id}`;
}

const MyCollectionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, isConnected } = useWallet();
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<CollectedDropItem | null>(null);
  const [routeCollectedItem] = useState<CollectedDropItem | null>(
    location.state?.collectedItem ?? null
  );
  const [highlightedId, setHighlightedId] = useState<string | null>(
    location.state?.highlightDropId ?? null
  );
  const collection = useCollectionStore((state) => state.items);
  const addCollectedDrop = useCollectionStore((state) => state.addCollectedDrop);
  const [chainCollection, setChainCollection] = useState<CollectedDropItem[]>([]);
  const [chainCollectionLoading, setChainCollectionLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      trackCollectionView(address);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (!routeCollectedItem || !address) {
      return;
    }

    if (routeCollectedItem.ownerWallet.toLowerCase() !== address.toLowerCase()) {
      return;
    }

    addCollectedDrop(routeCollectedItem);
  }, [addCollectedDrop, address, routeCollectedItem]);

  useEffect(() => {
    if (!isConnected || !address) {
      setChainCollection([]);
      setChainCollectionLoading(false);
      return;
    }

    let active = true;

    const fetchChainCollection = async () => {
      setChainCollectionLoading(true);

      try {
        const [drops, artists] = await Promise.all([
          fetchAllDropsFromSupabase(),
          fetchAllArtistsFromSupabase(),
        ]);

        const indexedDrops = (drops || []).filter(
          (drop) => drop.contract_address && drop.contract_drop_id !== null && drop.contract_drop_id !== undefined
        );

        if (indexedDrops.length === 0) {
          if (active) setChainCollection([]);
          return;
        }

        const artistMap = new Map((artists || []).map((artist) => [artist.id, artist]));
        const dropsByContractAndDropId = new Map(
          indexedDrops.map((drop) => [
            `${String(drop.contract_address).toLowerCase()}:${Number(drop.contract_drop_id)}`,
            drop,
          ])
        );
        const publicClient = createPublicClient({ chain: ACTIVE_CHAIN, transport: http() });
        const collector = getAddress(address);
        const uniqueContracts = Array.from(
          new Set(indexedDrops.map((drop) => String(drop.contract_address).toLowerCase()))
        );

        const logsByContract = await Promise.all(
          uniqueContracts.map(async (contractAddress) => {
            try {
              return await publicClient.getLogs({
                address: getAddress(contractAddress),
                event: artMintedEvent,
                args: { collector },
                fromBlock: "earliest",
                toBlock: "latest",
              });
            } catch (error) {
              console.warn(`Failed to read mint logs for ${contractAddress}:`, error);
              return [];
            }
          })
        );

        if (!active) return;

        const merged = new Map<string, CollectedDropItem>();

        logsByContract.flat().forEach((log) => {
          const contractAddress = String(log.address).toLowerCase();
          const contractDropId = Number(log.args.dropId);
          const mintedTokenId = Number(log.args.tokenId);
          const drop = dropsByContractAndDropId.get(`${contractAddress}:${contractDropId}`);

          if (!drop) {
            return;
          }

          const artist = artistMap.get(drop.artist_id);
          const item: CollectedDropItem = {
            id: drop.id,
            ownerWallet: address,
            title: drop.title || "Untitled",
            artist: artist?.name || "Unknown Artist",
            imageUrl: drop.image_url || "",
            previewUri: drop.preview_uri || undefined,
            deliveryUri: drop.delivery_uri || drop.image_ipfs_uri || undefined,
            assetType: drop.asset_type || "image",
            mintedTokenId,
            contractAddress,
            contractDropId,
            collectedAt: new Date().toISOString(),
          };

          merged.set(getCollectionItemKey(item), item);
        });

        setChainCollection(Array.from(merged.values()));
      } catch (error) {
        console.error("Failed to rebuild collection from chain:", error);
        if (active) {
          setChainCollection([]);
        }
      } finally {
        if (active) {
          setChainCollectionLoading(false);
        }
      }
    };

    fetchChainCollection();

    return () => {
      active = false;
    };
  }, [address, isConnected]);

  useEffect(() => {
    if (!highlightedId) return;

    const timer = window.setTimeout(() => {
      setHighlightedId(null);
      navigate(location.pathname, { replace: true, state: null });
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [highlightedId, location.pathname, navigate]);

  const ownedCollection = useMemo(() => {
    if (!address) return [];

    const normalizedAddress = address.toLowerCase();
    const merged = new Map<string, CollectedDropItem>();

    chainCollection.forEach((item) => {
      if (item.ownerWallet.toLowerCase() !== normalizedAddress) return;
      merged.set(getCollectionItemKey(item), item);
    });

    if (routeCollectedItem && routeCollectedItem.ownerWallet.toLowerCase() === normalizedAddress) {
      merged.set(getCollectionItemKey(routeCollectedItem), routeCollectedItem);
    }

    collection.forEach((item) => {
      if (item.ownerWallet.toLowerCase() !== normalizedAddress) return;
      const key = getCollectionItemKey(item);
      if (!merged.has(key)) {
        merged.set(key, item);
      }
    });

    return Array.from(merged.values()).sort((a, b) => {
      const aTime = new Date(a.collectedAt).getTime();
      const bTime = new Date(b.collectedAt).getTime();
      return bTime - aTime;
    });
  }, [address, chainCollection, collection, routeCollectedItem]);

  const collectedDrops = useMemo(() => {
    if (filter === "all") return ownedCollection;
    return ownedCollection;
  }, [filter, ownedCollection]);

  const renderViewer = () => {
    if (!selectedItem) return null;

    const src = ipfsToHttp(selectedItem.deliveryUri || selectedItem.previewUri || selectedItem.imageUrl);
    const poster = ipfsToHttp(selectedItem.previewUri || selectedItem.imageUrl || "");
    if (!src) return null;

    switch (selectedItem.assetType) {
      case "video":
        return <VideoViewer src={src} poster={poster} onClose={() => setSelectedItem(null)} />;
      case "audio":
        return <AudioPlayer src={src} title={selectedItem.title} onClose={() => setSelectedItem(null)} />;
      case "pdf":
        return <PdfReader src={src} title={selectedItem.title} onClose={() => setSelectedItem(null)} />;
      case "epub":
        return <EpubReader src={src} title={selectedItem.title} onClose={() => setSelectedItem(null)} />;
      case "image":
      default:
        return <ImageViewer src={src} alt={selectedItem.title} onClose={() => setSelectedItem(null)} />;
    }
  };

  if (!isConnected) {
    return (
      <div className="px-4 py-10 text-center space-y-4">
        <p className="text-lg font-semibold text-foreground">Connect Your Wallet</p>
        <p className="text-sm text-muted-foreground">Connect to see your NFT collection</p>
        <Button onClick={() => navigate(-1)} className="rounded-full gradient-primary text-primary-foreground">
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl my-8">
            <div className="bg-black/90 rounded-xl overflow-hidden">
              <div className="max-h-96 overflow-hidden">{renderViewer()}</div>
              <div className="p-6 border-t border-gray-700 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedItem.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{selectedItem.artist}</p>
                </div>

                <DownloadPanel
                  fileName={selectedItem.title}
                  fileType={selectedItem.assetType}
                  isGated={selectedItem.isGated || false}
                  isOwned={true}
                  downloadUrl={ipfsToHttp(selectedItem.deliveryUri || selectedItem.previewUri || "")}
                  accessNote={selectedItem.isGated ? "You own this item. Delivery files are available." : undefined}
                  onDownload={() => {
                    if (selectedItem.deliveryUri) {
                      window.open(ipfsToHttp(selectedItem.deliveryUri), "_blank");
                    }
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-background px-4 pt-3 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-secondary/50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">My Collection</h1>
      </div>

      <div className="px-4 flex gap-2">
        {["all", "owned"].map((entry) => (
          <button
            key={entry}
            onClick={() => setFilter(entry)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              filter === entry ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {entry.charAt(0).toUpperCase() + entry.slice(1)}
          </button>
        ))}
      </div>

      {chainCollectionLoading && collectedDrops.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground font-body">Loading your collected art...</p>
        </div>
      )}

      {!chainCollectionLoading && collectedDrops.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-body">You haven&apos;t collected any art yet.</p>
          <p className="text-xs text-muted-foreground font-body mt-1">Visit the drops page to start collecting.</p>
          <Button onClick={() => navigate("/drops")} variant="outline" className="mt-4 rounded-full">
            Browse Drops
          </Button>
        </div>
      ) : collectedDrops.length > 0 ? (
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3">
            {collectedDrops.map((drop) => {
              const isHighlighted = highlightedId === drop.id;

              return (
                <div
                  key={drop.id}
                  onClick={() => setSelectedItem(drop)}
                  className={`rounded-xl overflow-hidden bg-card shadow-card cursor-pointer group transition-all duration-700 ${
                    isHighlighted ? "ring-2 ring-primary shadow-elevated scale-[1.03] [transform:rotateY(180deg)]" : "hover:shadow-elevated"
                  }`}
                >
                  <div className="aspect-square overflow-hidden relative bg-secondary">
                    {drop.assetType === "video" && drop.previewUri ? (
                      <img
                        src={ipfsToHttp(drop.previewUri)}
                        alt={drop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : drop.assetType === "audio" ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-900 text-white text-xs font-semibold">
                        Audio Collect
                      </div>
                    ) : drop.assetType === "pdf" ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600 to-red-900 text-white text-xs font-semibold">
                        PDF Collect
                      </div>
                    ) : drop.assetType === "epub" ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600 to-amber-900 text-white text-xs font-semibold">
                        eBook Collect
                      </div>
                    ) : (
                      <img
                        src={ipfsToHttp(drop.imageUrl || "https://images.unsplash.com/photo-1578321272176-c8593e05e55a?w=400&h=400&fit=crop")}
                        alt={drop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    {isHighlighted && (
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/35 via-transparent to-transparent" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold truncate text-foreground">{drop.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{drop.artist}</p>
                    <p className="text-xs text-primary mt-1 uppercase tracking-wide">
                      {drop.assetType || "image"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center pb-4 pt-2 text-xs text-muted-foreground font-body">
            <p>{collectedDrops.length} items in collection</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MyCollectionPage;
