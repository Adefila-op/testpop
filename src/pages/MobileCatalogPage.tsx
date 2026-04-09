import React, { useState, useEffect } from 'react';
import { Search, Filter, SortAsc, X } from 'lucide-react';
import { supabase } from '@/lib/db';
import { CatalogItem } from '@/utils/catalogUtils';

interface MobileCatalogPageProps {
  defaultType?: 'drop' | 'product' | 'release' | 'all';
}

export function MobileCatalogPage({ defaultType = 'all' }: MobileCatalogPageProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [filterTypes, setFilterTypes] = useState<('drop' | 'product' | 'release')[]>(
    defaultType === 'all' ? ['drop', 'product', 'release'] : [defaultType as any]
  );
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const limit = 20;
        const offset = (page - 1) * limit;

        let query = supabase
          .from('catalog_with_engagement')
          .select('*', { count: 'exact' });

        // Apply type filter
        if (filterTypes.length > 0 && filterTypes.length < 3) {
          query = query.in('item_type', filterTypes);
        }

        // Apply search
        if (searchQuery) {
          query = query.or(
            `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
          );
        }

        // Apply sort
        switch (sortBy) {
          case 'popular':
            query = query.order('comment_count', { ascending: false });
            break;
          case 'trending':
            query = query.order('updated_at', { ascending: false });
            break;
          case 'recent':
          default:
            query = query.order('created_at', { ascending: false });
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        if (page === 1) {
          setItems(data || []);
        } else {
          setItems((prev) => [...prev, ...(data || [])]);
        }

        setHasMore((data?.length || 0) >= limit);
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [page, searchQuery, sortBy, filterTypes]);

  const handleTypeToggle = (type: 'drop' | 'product' | 'release') => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Fixed header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 p-3 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Filter & Sort toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 flex items-center justify-center gap-2 p-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="recent">Latest</option>
            <option value="popular">Popular</option>
            <option value="trending">Trending</option>
          </select>
        </div>
      </div>

      {/* Filter modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">Type</p>
              {(['drop', 'product', 'release'] as const).map((type) => (
                <label key={type} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={filterTypes.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    className="w-4 h-4 rounded accent-purple-600"
                  />
                  <span className="text-sm">
                    {type === 'drop' && '🎨 NFT Drops'}
                    {type === 'product' && '📦 Products'}
                    {type === 'release' && '🎬 Releases'}
                  </span>
                </label>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(false)}
              className="w-full mt-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="p-3 space-y-3">
        {items.map((item) => (
          <MobileItemCard key={`${item.item_type}-${item.id}`} item={item} />
        ))}

        {/* Load more button */}
        {hasMore && (
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
            className="w-full py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        )}

        {items.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p>No items found</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface MobileItemCardProps {
  item: CatalogItem;
}

function MobileItemCard({ item }: MobileItemCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative bg-gray-100 h-40 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {item.item_type === 'drop' ? '🎨' : item.item_type === 'product' ? '📦' : '🎬'}
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-2 right-2 bg-black/75 text-white px-2 py-1 rounded-full text-xs font-medium">
          {item.item_type === 'drop' ? 'NFT' : item.item_type === 'product' ? 'Product' : 'Release'}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>

        {item.description && (
          <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
        )}

        {/* Engagement */}
        {(item.comment_count || item.avg_rating) && (
          <div className="flex gap-2 text-xs text-gray-500">
            {item.avg_rating > 0 && <span>⭐ {item.avg_rating.toFixed(1)}</span>}
            {item.comment_count > 0 && <span>💬 {item.comment_count}</span>}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-sm text-purple-600">
            Ξ{item.price_eth?.toFixed(3) || '0'}
          </span>
          <button
            className={`text-xs font-medium px-3 py-1.5 rounded ${
              item.can_purchase
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-100 text-gray-400'
            }`}
            disabled={!item.can_purchase}
          >
            {item.can_purchase ? 'Get' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileCatalogPage;
