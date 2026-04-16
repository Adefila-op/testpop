/**
 * Item Detail Modal
 * Location: src/components/phase3/ItemDetailModal.tsx
 * 
 * Detailed product view modal with purchase, auction creation, and gifting
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetProduct } = '@/hooks/useProductStore';
import { usePurchaseProduct, useEstimatePurchaseGas } = '@/hooks/useProductStore';
import {
  ShoppingCart,
  Gavel,
  Gift,
  Loader2,
  AlertCircle,
  Star,
  Users,
  TrendingUp,
} from 'lucide-react';
import { GiftDialog } from './gift/GiftDialog';

interface ItemDetailModalProps {
  productId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseStart?: () => void;
  onAuctionStart?: (productId: number) => void;
}

export function ItemDetailModal({
  productId,
  open,
  onOpenChange,
  onPurchaseStart,
  onAuctionStart,
}: ItemDetailModalProps) {
  const { address } = useAccount();
  const [quantity, setQuantity] = useState(1);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: product, isLoading: productLoading } = useGetProduct(productId || 0);
  const { data: gasEstimate, isLoading: gasLoading } = useEstimatePurchaseGas(
    productId || 0,
    quantity
  );
  const { mutate: purchase, isLoading: purchasing } = usePurchaseProduct(productId || 0);

  if (!productId) return null;

  if (productLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center h-96 text-red-600">
            Product not found
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isCreator = address === (product as any).creatorAddress;
  const availability = (product as any).supply - (product as any).sold;

  const handlePurchase = () => {
    purchase(
      { quantity },
      {
        onSuccess: () => {
          onPurchaseStart?.();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{(product as any).name}</DialogTitle>
            <DialogDescription>
              Detailed product information and options
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Product Image */}
            <div className="space-y-3">
              <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
                {(product as any).image && (
                  <img
                    src={(product as any).image}
                    alt={(product as any).name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-2xl font-bold">{(product as any).sold}</p>
                  <p className="text-xs text-gray-600">Sold</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Star className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
                  <p className="text-2xl font-bold">4.8</p>
                  <p className="text-xs text-gray-600">Rating</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                  <p className="text-2xl font-bold">{(product as any).sold || 0}</p>
                  <p className="text-xs text-gray-600">Buyers</p>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              {/* Price */}
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {parseFloat((product as any).price).toFixed(4)} ETH
                  </span>
                  <span className="text-gray-600">
                    ${(parseFloat((product as any).price) * 2500).toFixed(0)} USD
                  </span>
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Availability</p>
                <Badge
                  className={
                    availability === 0
                      ? 'bg-red-100 text-red-800'
                      : availability < 5
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }
                >
                  {availability === 0 ? 'Out of Stock' : `${availability} Available`}
                </Badge>
              </div>

              {/* Creator */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Creator</p>
                <p className="font-semibold">{(product as any).creatorName || 'Unknown'}</p>
                <p className="text-xs text-gray-600 font-mono">
                  {(product as any).creatorAddress}
                </p>
              </div>

              {/* Purchase Section */}
              {!isCreator && (product as any).status === 'active' && (
                <div className="space-y-3 border-t pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Quantity</label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        −
                      </Button>
                      <input
                        type="number"
                        min="1"
                        max={availability}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(Math.max(1, Math.min(availability, parseInt(e.target.value) || 1)))
                        }
                        className="w-16 text-center border rounded px-2 py-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.min(availability, quantity + 1))}
                      >
                        +
                      </Button>
                      <span className="text-sm text-gray-600 ml-2">
                        {availability === 0 ? 'Out of stock' : `${availability} available`}
                      </span>
                    </div>
                  </div>

                  {/* Gas Estimate */}
                  {gasEstimate && !gasLoading && (
                    <div className="p-2 bg-blue-50 rounded text-xs text-blue-800">
                      <p className="font-semibold">Estimated Gas: {gasEstimate}</p>
                    </div>
                  )}

                  {/* Purchase Button */}
                  <Button
                    onClick={handlePurchase}
                    disabled={
                      purchasing || availability === 0
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Purchasing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Now
                      </>
                    )}
                  </Button>

                  {/* Gift Button */}
                  <Button
                    onClick={() => setShowGiftDialog(true)}
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled={availability === 0}
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Send as Gift
                  </Button>
                </div>
              )}

              {/* Creator Actions */}
              {isCreator && (
                <div className="space-y-2 border-t pt-4">
                  <Button
                    onClick={() => onAuctionStart?.(productId)}
                    className="w-full"
                    variant="outline"
                  >
                    <Gavel className="w-4 h-4 mr-2" />
                    Create Auction
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Description Tab */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">
                Overview
              </TabsTrigger>
              <TabsTrigger value="description" className="flex-1">
                Description
              </TabsTrigger>
              <TabsTrigger value="details" className="flex-1">
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 mt-4">
              <div className="space-y-2">
                <h4 className="font-semibold">About This Product</h4>
                <p className="text-sm text-gray-700">{(product as any).description}</p>
              </div>
            </TabsContent>

            <TabsContent value="description" className="space-y-3 mt-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Full Description</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {(product as any).fullDescription || (product as any).description}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Supply</p>
                  <p className="text-lg font-bold">{(product as any).supply}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Royalty %</p>
                  <p className="text-lg font-bold">
                    {((product as any).royaltyBps || 0) / 100}%
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Gift Dialog */}
      <GiftDialog
        open={showGiftDialog}
        onOpenChange={setShowGiftDialog}
        productId={productId}
        productName={(product as any).name}
      />
    </>
  );
}

export default ItemDetailModal;
