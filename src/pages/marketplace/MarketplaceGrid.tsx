/**
 * Marketplace Grid Component
 * Location: src/pages/marketplace/MarketplaceGrid.tsx
 * 
 * Main marketplace page with browsable products and filters
 */

import React, { useState, useMemo } from 'react';
import { useGetProducts } from '@/hooks/useProductStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import {
  Search,
  SlidersHorizontal,
  ShoppingCart,
  Gavel,
  Gift,
  Star,
} from 'lucide-react';
import { ItemDetailModal } from '@/components/phase3/ItemDetailModal';

interface Product {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  creator: string;
  price: number;
  currency: 'ETH' | 'USDC';
  rating?: number;
  reviews?: number;
  stock?: number;
  tags: string[];
  featured?: boolean;
}

export function MarketplaceGrid() {
  const { data: products, isLoading } = useGetProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState('featured');
  const [filterTag, setFilterTag] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [showFilters, setShowFilters] = useState(false);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    (products || []).forEach((p: Product) => {
      p.tags?.forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = (products || []).filter((product: Product) => {
      const queryMatch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.creator.toLowerCase().includes(searchQuery.toLowerCase());

      const tagMatch =
        filterTag === 'all' ||
        (product.tags && product.tags.includes(filterTag));

      const priceMatch =
        product.price >= priceRange[0] && product.price <= priceRange[1];

      return queryMatch && tagMatch && priceMatch;
    });

    // Sort
    switch (sortBy) {
      case 'featured':
        filtered.sort((a: Product) => (a.featured ? -1 : 1));
        break;
      case 'newest':
        // Assume tokenId indicates order
        filtered.sort((a: Product, b: Product) =>
          parseInt(b.tokenId) - parseInt(a.tokenId)
        );
        break;
      case 'price-low':
        filtered.sort((a: Product, b: Product) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a: Product, b: Product) => b.price - a.price);
        break;
      case 'popular':
        filtered.sort((a: Product, b: Product) =>
          (b.reviews || 0) - (a.reviews || 0)
        );
        break;
      case 'rating':
        filtered.sort((a: Product, b: Product) =>
          (b.rating || 0) - (a.rating || 0)
        );
        break;
    }

    return filtered;
  }, [products, searchQuery, filterTag, priceRange, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
          <p className="text-gray-600">
            Discover unique digital art and collectibles
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, creator, or description..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={showFilters} onOpenChange={setShowFilters}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Filters</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Price Range */}
                    <div>
                      <h3 className="font-semibold mb-4">Price Range (ETH)</h3>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={priceRange}
                        onValueChange={setPriceRange}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm mt-2">
                        <span>{priceRange[0]} ETH</span>
                        <span>{priceRange[1]} ETH</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {allTags.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Category</h3>
                        <div className="space-y-2">
                          <Button
                            variant={filterTag === 'all' ? 'default' : 'outline'}
                            className="w-full justify-start"
                            onClick={() => setFilterTag('all')}
                          >
                            All Categories
                          </Button>
                          {allTags.map((tag) => (
                            <Button
                              key={tag}
                              variant={filterTag === tag ? 'default' : 'outline'}
                              className="w-full justify-start"
                              onClick={() => setFilterTag(tag)}
                            >
                              {tag}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredProducts.length} of {products?.length || 0} items
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product: Product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />

                  {/* Badges */}
                  <div className="absolute top-2 right-2 space-y-1">
                    {product.featured && (
                      <Badge className="bg-yellow-500 block">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {product.stock !== undefined && product.stock === 0 && (
                      <Badge className="bg-gray-700 block">Sold Out</Badge>
                    )}
                  </div>

                  {/* Creator Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="outline" className="bg-white">
                      {product.creator.slice(0, 6)}...
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  {/* Rating */}
                  {product.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.round(product.rating || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-600">
                        {product.rating.toFixed(1)}
                        {product.reviews && ` (${product.reviews})`}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                    {product.description}
                  </p>

                  {/* Tags */}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {product.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {product.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{product.tags.length - 2}
                      </Badge>
                    )}
                  </div>

                  {/* Price */}
                  <p className="text-lg font-bold text-gray-900 mb-3">
                    {product.price} {product.currency}
                  </p>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          size="sm"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <ShoppingCart className="w-3 h-3 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      {selectedProduct?.id === product.id && (
                        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
                          <ItemDetailModal product={product} />
                        </DialogContent>
                      )}
                    </Dialog>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center justify-center gap-1"
                      >
                        <Gavel className="w-3 h-3" />
                        Auction
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center justify-center gap-1"
                      >
                        <Gift className="w-3 h-3" />
                        Gift
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">
                No products found
              </p>
              <p className="text-gray-600">
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default MarketplaceGrid;
