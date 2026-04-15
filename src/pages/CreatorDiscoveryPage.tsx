import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreatorMarketplaceCard } from '@/components/phase3/CreatorMarketplaceCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlertCircle, Search, Filter, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Creator {
  id: string;
  address: string;
  name: string;
  image: string;
  bio: string;
  collectionAddress: string;
  collectionName?: string;
  price?: string; // Price of creator card NFT
  cardTokenId?: string;
  sales24h?: number;
  volume24h?: string;
  verified?: boolean;
  followerCount?: number;
}

type SortOption = 'trending' | 'newest' | 'most-sales' | 'price-low' | 'price-high';
type CategoryOption = 'all' | 'verified' | 'trending' | 'affordable';

export function CreatorDiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [category, setCategory] = useState<CategoryOption>('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 });

  // Fetch creators
  const { data: creatorsData, isLoading, error } = useQuery({
    queryKey: ['creators', category],
    queryFn: async () => {
      const response = await fetch(`/api/creators?category=${category}`);
      if (!response.ok) throw new Error('Failed to fetch creators');
      return response.json() as Promise<Creator[]>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Filter and sort creators
  const filteredCreators = useMemo(() => {
    if (!creatorsData) return [];

    let filtered = creatorsData.filter(creator => {
      const matchesSearch = creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.bio.toLowerCase().includes(searchQuery.toLowerCase());
      
      const price = parseFloat(creator.price || '0');
      const inPriceRange = price >= priceRange.min && price <= priceRange.max;

      return matchesSearch && inPriceRange;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'trending':
          return (b.sales24h || 0) - (a.sales24h || 0);
        case 'newest':
          return b.id.localeCompare(a.id);
        case 'most-sales':
          return (b.sales24h || 0) - (a.sales24h || 0);
        case 'price-low':
          return parseFloat(a.price || '0') - parseFloat(b.price || '0');
        case 'price-high':
          return parseFloat(b.price || '0') - parseFloat(a.price || '0');
        default:
          return 0;
      }
    });

    return filtered;
  }, [creatorsData, searchQuery, sortBy, priceRange]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleCategoryChange = useCallback((value: CategoryOption) => {
    setCategory(value);
  }, []);

  const handleSortChange = useCallback((value: SortOption) => {
    setSortBy(value);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-500">Error Loading Creators</h3>
              <p className="text-sm text-red-500/70 mt-1">
                {error instanceof Error ? error.message : 'An error occurred while loading creators'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Creator Discovery
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Discover and collect creator NFT cards on the POPUP marketplace
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search creators by name or bio..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Category</label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Creators</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="trending">Trending</SelectItem>
                    <SelectItem value="affordable">Under 10 ETH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trending">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Trending
                      </div>
                    </SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="most-sales">Most Sales</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Min Price (ETH)</label>
                <Input
                  type="number"
                  min="0"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(p => ({ ...p, min: parseFloat(e.target.value) || 0 }))}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Max Price (ETH)</label>
                <Input
                  type="number"
                  min="0"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(p => ({ ...p, max: parseFloat(e.target.value) || 100 }))}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Results Info */}
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Showing {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''}</span>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSearch('')}
                  className="text-slate-400 hover:text-slate-300"
                >
                  Clear search
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Creator Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-96">
            <LoadingSpinner />
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <Filter className="w-12 h-12 mx-auto opacity-50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No creators found</h3>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCreators.map((creator) => (
              <CreatorMarketplaceCard
                key={creator.id}
                creator={creator}
                onBuy={(creator) => {
                  // Handle buy action
                  console.log('Buy creator:', creator);
                }}
                onViewProfile={(creatorId) => {
                  // Navigate to creator profile
                  window.location.href = `/creator/${creatorId}`;
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {filteredCreators.length > 0 && (
        <div className="border-t border-slate-700/50 bg-gradient-to-t from-slate-900 to-transparent mt-16">
          <div className="max-w-7xl mx-auto px-4 py-12 text-center">
            <h3 className="text-xl font-semibold mb-4">Create Your Own Creator Card</h3>
            <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
              Want to showcase your work and build a community? List your creator card on our marketplace and start building your collection.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              Become a Creator
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
