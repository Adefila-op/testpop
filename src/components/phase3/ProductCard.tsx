/**
 * Product Card Component
 * Location: src/components/phase3/ProductCard.tsx
 * 
 * Product listing card with purchase, auction, and gift options integrated with hooks
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetProduct } from '@/hooks/useProductStore';
import { ShoppingCart, Gavel, Gift, Loader2, AlertCircle } from 'lucide-react';
import { formatEther } from 'ethers';
import { GiftDialog } from './gift/GiftDialog';

interface ProductCardProps {
  productId: number;
  onPurchaseClick?: (productId: number) => void;
  onAuctionClick?: (productId: number) => void;
  compact?: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  creatorAddress: string;
  creatorName?: string;
  supply: number;
  sold: number;
  status: 'active' | 'paused' | 'ended';
  availability?: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export function ProductCard({
  productId,
  onPurchaseClick,
  onAuctionClick,
  compact = false,
}: ProductCardProps) {
  const { address } = useAccount();
  const { data: product, isLoading, error } = useGetProduct(productId);
  const [showGiftDialog, setShowGiftDialog] = useState(false);

  if (isLoading) {
    return (
      <Card className={compact ? 'h-64' : ''}>
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error || !product) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>Failed to load product</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const prod = product as unknown as Product;
  const isCreator = address === prod.creatorAddress;
  const availability = prod.supply - prod.sold;
  const soldPercentage = (prod.sold / prod.supply) * 100;

  const getAvailabilityStatus = () => {
    if (availability === 0) return 'out-of-stock';
    if (availability < 5) return 'low-stock';
    return 'in-stock';
  };

  const getStatusColor = () => {
    const status = getAvailabilityStatus();
    if (status === 'out-of-stock') return 'bg-red-100 text-red-800';
    if (status === 'low-stock') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = () => {
    const status = getAvailabilityStatus();
    if (status === 'out-of-stock') return 'Out of Stock';
    if (status === 'low-stock') return `Only ${availability} left`;
    return `${availability} available`;
  };

  return (
    <>
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${compact ? 'flex flex-col' : ''}`}>
        {/* Product Image */}
        <div className="relative aspect-square w-full bg-gray-100 overflow-hidden group">
          {prod.image && (
            <img
              src={prod.image}
              alt={prod.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          )}

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>

          {/* Status Indicator */}
          {prod.status !== 'active' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <p className="text-white font-semibold capitalize">{prod.status}</p>
            </div>
          )}
        </div>

        {/* Product Info */}
        <CardHeader className="pb-3">
          <div className="space-y-2">
            <CardTitle className="text-base line-clamp-2" title={prod.name}>
              {prod.name}
            </CardTitle>
            <p className="text-xs text-gray-600 line-clamp-2">{prod.description}</p>
          </div>
        </CardHeader>

        <CardContent className={`space-y-3 ${compact ? 'flex-1 flex flex-col' : ''}`}>
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{parseFloat(prod.price).toFixed(4)} ETH</span>
            <span className="text-xs text-gray-600">
              ${(parseFloat(prod.price) * 2500).toFixed(0)}
            </span>
          </div>

          {/* Creator Info */}
          <div className="text-xs text-gray-600">
            <p>by {prod.creatorName || `${prod.creatorAddress.slice(0, 6)}...`}</p>
          </div>

          {/* Sales Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{prod.sold}/{prod.supply} sold</span>
              <span>{Math.round(soldPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all"
                style={{ width: `${Math.min(soldPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex gap-2 ${compact ? 'mt-auto' : ''}`}>
            {isCreator ? (
              <Button
                disabled
                variant="outline"
                className="flex-1 text-xs"
                title="You created this product"
              >
                Your Product
              </Button>
            ) : (
              <>
                {/* Purchase Button */}
                <Button
                  onClick={() => onPurchaseClick?.(productId)}
                  disabled={prod.status !== 'active' || availability === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Buy
                </Button>

                {/* Gift Button */}
                <Button
                  onClick={() => setShowGiftDialog(true)}
                  disabled={prod.status !== 'active' || availability === 0}
                  variant="outline"
                  size="sm"
                  title="Send as a gift"
                >
                  <Gift className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Auction Option */}
          {isCreator && prod.status === 'active' && (
            <Button
              onClick={() => onAuctionClick?.(productId)}
              variant="outline"
              className="w-full text-xs"
              size="sm"
            >
              <Gavel className="w-4 h-4 mr-1" />
              Create Auction
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Gift Dialog */}
      <GiftDialog
        open={showGiftDialog}
        onOpenChange={setShowGiftDialog}
        productId={productId}
        productName={prod.name}
        onGiftSent={() => {
          setShowGiftDialog(false);
        }}
      />
    </>
  );
}

export default ProductCard;
