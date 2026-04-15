/**
 * Creator Card Component - Display creator profile with marketplace stats
 * Shows creator info, marketplace stats, and quick actions
 */

import { useState } from 'react';
import { useMarketplaceStats } from '@/hooks/useMarketplaceStats';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  ExternalLink,
  TrendingUp,
  ShoppingCart,
  Users,
  AlertCircle,
  Share2,
} from 'lucide-react';
import {
  getMarketplaceCreatorUrl,
  getMarketplaceCollectionUrl,
  Marketplace,
} from '@/lib/marketplaceIntegration';

interface CreatorCardProps {
  creatorId: string;
  creatorAddress: string;
  name: string;
  image: string;
  bio?: string;
  collectionAddress?: string;
  onViewDetails?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
}

export function CreatorCard({
  creatorId,
  creatorAddress,
  name,
  image,
  bio,
  collectionAddress,
  onViewDetails,
  onFollow,
  isFollowing = false,
}: CreatorCardProps) {
  const { stats, recentSales, isLoading, error } = useMarketplaceStats(collectionAddress);
  const [activeMarketplace, setActiveMarketplace] = useState<Marketplace>('OPENSEA');

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const marketplaces: Marketplace[] = ['OPENSEA', 'RARIBLE', 'BLUR'];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      {/* Header Background */}
      <div className="h-24 bg-gradient-to-r from-purple-500 to-pink-500" />

      {/* Profile Section */}
      <CardHeader className="pb-3 -mt-12 relative z-10">
        <div className="flex items-end gap-4">
          <div className="w-24 h-24 rounded-lg border-4 border-background bg-muted overflow-hidden flex-shrink-0">
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 pb-2">
            <CardTitle className="text-xl">{name}</CardTitle>
            <CardDescription className="text-xs">Creator</CardDescription>
          </div>
        </div>

        {bio && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{bio}</p>
        )}
      </CardHeader>

      {/* Stats Section */}
      {stats && (
        <CardContent className="space-y-4 flex-1">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-muted rounded">
              <p className="text-2xl font-bold">{stats.totalSales}</p>
              <p className="text-xs text-muted-foreground">Sales</p>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <p className="text-2xl font-bold">{stats.averagePrice}</p>
              <p className="text-xs text-muted-foreground">Avg Price</p>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <p className="text-2xl font-bold">{stats.totalVolume24h}</p>
              <p className="text-xs text-muted-foreground">24h Vol</p>
            </div>
          </div>

          {/* Volume Tabs */}
          <div className="space-y-2">
            <Tabs defaultValue="24h" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="24h" className="text-xs">24h</TabsTrigger>
                <TabsTrigger value="7d" className="text-xs">7d</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs">30d</TabsTrigger>
              </TabsList>
              <TabsContent value="24h" className="mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{stats.totalVolume24h} ETH</span>
                  <span className="text-muted-foreground">in 24h</span>
                </div>
              </TabsContent>
              <TabsContent value="7d" className="mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{stats.totalVolume7d} ETH</span>
                  <span className="text-muted-foreground">in 7d</span>
                </div>
              </TabsContent>
              <TabsContent value="30d" className="mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{stats.totalVolume30d} ETH</span>
                  <span className="text-muted-foreground">in 30d</span>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Recent Sales Preview */}
          {recentSales && recentSales.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground">Recent Sales</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {recentSales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between text-xs p-1.5 bg-muted rounded"
                  >
                    <span className="text-muted-foreground truncate">
                      {sale.buyer.slice(0, 6)}...{sale.buyer.slice(-4)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {sale.priceEth} ETH
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}

      {error && (
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load marketplace stats</span>
          </div>
        </CardContent>
      )}

      {/* Marketplace Links */}
      <CardFooter className="flex gap-2 flex-wrap pt-4 border-t">
        {collectionAddress && (
          <>
            {marketplaces.map((marketplace) => (
              <Button
                key={marketplace}
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                asChild
              >
                <a
                  href={getMarketplaceCollectionUrl(collectionAddress, marketplace)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  {marketplace}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            ))}
          </>
        )}
      </CardFooter>

      {/* Action Buttons */}
      <CardFooter className="flex gap-2 pt-0">
        <Button
          onClick={onViewDetails}
          variant="default"
          size="sm"
          className="flex-1"
        >
          <Users className="mr-1 w-4 h-4" />
          View Profile
        </Button>
        <Button
          onClick={onFollow}
          variant={isFollowing ? 'secondary' : 'outline'}
          size="sm"
          className="flex-1"
        >
          <Share2 className="mr-1 w-4 h-4" />
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      </CardFooter>
    </Card>
  );
}
