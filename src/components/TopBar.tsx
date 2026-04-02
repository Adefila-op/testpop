import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { supabase } from "@/lib/db";

const TopBarWalletControls = lazy(() => import("./wallet/TopBarWalletControls"));

type SearchResults = {
  artists: Array<{ id: string; name?: string | null; tag?: string | null; avatar_url?: string | null }>;
  drops: Array<{ id: string; title?: string | null; price_eth?: string | number | null; image_url?: string | null }>;
  products: Array<{ id: string; name?: string | null; price_eth?: string | number | null; image_url?: string | null; image_ipfs_uri?: string | null }>;
};

function SearchPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ artists: [], drops: [], products: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ artists: [], drops: [], products: [] });
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const [artistRes, dropRes, productRes] = await Promise.all([
          supabase
            .from("artists")
            .select("id, name, tag, avatar_url")
            .ilike("name", `%${query}%`)
            .limit(4),
          supabase
            .from("drops")
            .select("id, title, price_eth, image_url")
            .ilike("title", `%${query}%`)
            .limit(4),
          supabase
            .from("products")
            .select("id, name, price_eth, image_url, image_ipfs_uri")
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
            .eq("status", "published")
            .limit(4),
        ]);

        setResults({
          artists: artistRes.data || [],
          drops: dropRes.data || [],
          products: productRes.data || [],
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const hasResults = results.artists.length > 0 || results.drops.length > 0 || results.products.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border max-w-6xl mx-auto w-full">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search artists, drops, products..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <button onClick={onClose} aria-label="Close search" className="p-1.5 rounded-full hover:bg-secondary transition-colors">
          <X className="h-4 w-4 text-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full px-4 py-4">
        {!query && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Search for artists, drops, or products
          </p>
        )}

        {query && !loading && !hasResults && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            No results for "{query}"
          </p>
        )}

        {results.artists.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Artists</p>
            <div className="space-y-2">
              {results.artists.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => {
                    navigate(`/artists/${artist.id}`);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                    {artist.avatar_url && (
                      <img src={artist.avatar_url} alt={artist.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{artist.name || "Untitled Artist"}</p>
                    <p className="text-xs text-muted-foreground">{artist.tag || "Artist"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {results.drops.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Drops</p>
            <div className="space-y-2">
              {results.drops.map((drop) => (
                <button
                  key={drop.id}
                  onClick={() => {
                    navigate(`/drops/${drop.id}`);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {drop.image_url && (
                      <img src={drop.image_url} alt={drop.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{drop.title}</p>
                    <p className="text-xs text-muted-foreground">{drop.price_eth} ETH</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {results.products.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Products</p>
            <div className="space-y-2">
              {results.products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    navigate(`/products/${product.id}`);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name || "Product"} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{product.name || "Untitled Product"}</p>
                    <p className="text-xs text-muted-foreground">{product.price_eth ?? "0"} ETH</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TopBar = () => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-12 md:h-14 px-3 md:px-4 max-w-6xl mx-auto relative">
          <img src={logo} alt="PopUp" className="h-6 md:h-7" />
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => {
                setShowSearch(true);
              }}
              aria-label="Open search"
              className="p-1.5 md:p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <Search className="h-4 w-4 md:h-5 md:w-5 text-foreground" />
            </button>
            <Suspense fallback={<div className="h-8 w-24 rounded-full bg-secondary animate-pulse" />}>
              <TopBarWalletControls />
            </Suspense>
          </div>
        </div>
      </header>

      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
    </>
  );
};

export default TopBar;
