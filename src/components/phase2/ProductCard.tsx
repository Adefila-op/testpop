/**
 * Product Card Component - Display product listings
 * Shows product details with purchase functionality
 */

import { useState } from 'react';
import { useProduct } from '@/hooks/useProducts';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  productId: string;
  onPurchaseSuccess?: (tokenId: string) => void;
  onPurchaseError?: (error: Error) => void;
}

export function ProductCard({
  productId,
  onPurchaseSuccess,
  onPurchaseError,
}: ProductCardProps) {
  const { product, isLoading } = useProduct(productId);
  const { address } = useWallet();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!product) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            Product not found
          </div>
        </CardContent>
      </Card>
    );
  }

  const handlePurchase = async () => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}/purchase`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Purchase failed');
      }

      const data = await response.json();
      onPurchaseSuccess?.(data.tokenId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Purchase failed');
      setError(error.message);
      onPurchaseError?.(error);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform"
        />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="line-clamp-2">{product.name}</CardTitle>
            <CardDescription className="text-xs">{product.creator}</CardDescription>
          </div>
          <Badge variant={product.status === 'sold' ? 'secondary' : 'default'}>
            {product.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        <div className="mt-4 pt-4 border-t">
          <p className="text-2xl font-bold">{product.priceEth} ETH</p>
          <p className="text-xs text-muted-foreground">{product.totalSales} sold</p>
        </div>
      </CardContent>
      {product.status === 'active' && (
        <CardFooter className="flex gap-2">
          <Button
            onClick={handlePurchase}
            disabled={isPurchasing || !address}
            className="flex-1"
          >
            {isPurchasing && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            <ShoppingCart className="mr-2 w-4 h-4" />
            Buy Now
          </Button>
        </CardFooter>
      )}
      {error && (
        <CardFooter>
          <div className="w-full text-sm text-destructive flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
