/**
 * Creator Profile Page Component
 * Full creator profile with marketplace stats, activity, and earnings
 */

import { useState } from 'react';
import { useCreator } from '@/hooks/useCreator';
import { useMarketplaceStats } from '@/hooks/useMarketplaceStats';
import { CreatorCard } from './CreatorCard';
import { MarketplaceActivity, MarketplaceStats } from './MarketplaceActivity';
import { CreatorEarningsPanel } from '@/components/phase2';
import { RoyaltiesPanel } from '@/components/phase2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  AlertCircle,
  Share2,
  ExternalLink,
  Heart,
  MessageCircle,
  Copy,
  Check,
  ShoppingCart,
} from 'lucide-react';

interface CreatorProfilePageProps {
  creatorId: string;
  creatorAddress: string;
  creatorName: string;
  creatorImage: string;
  creatorBio?: string;
  collectionAddress?: string;
  collectionName?: string;
}

export function CreatorProfilePage({
  creatorId,
  creatorAddress,
  creatorName,
  creatorImage,
  creatorBio,
  collectionAddress,
  collectionName,
}: CreatorProfilePageProps) {
  const { earnings, payoutHistory, isLoadingEarnings } = useCreator();
  const { stats, recentSales, isLoading: isLoadingStats } = useMarketplaceStats(collectionAddress);
  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(creatorAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Hero Section with Creator Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <CreatorCard
            creatorId={creatorId}
            creatorAddress={creatorAddress}
            name={creatorName}
            image={creatorImage}
            bio={creatorBio}
            collectionAddress={collectionAddress}
            isFollowing={isFollowing}
            onFollow={() => setIsFollowing(!isFollowing)}
          />
        </div>

        <div className="md:col-span-2 space-y-4">
          {/* Creator Header Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl">{creatorName}</CardTitle>
                  <CardDescription>{collectionName || 'Collection Creator'}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Heart className="mr-2 w-4 h-4" />
                    Favorite
                  </Button>
                  <Button size="sm" variant="outline">
                    <Share2 className="mr-2 w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {creatorBio && (
                <p className="text-sm text-muted-foreground">{creatorBio}</p>
              )}

              {/* Address Info */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded">
                <span className="text-sm font-mono text-muted-foreground">
                  {creatorAddress.slice(0, 10)}...{creatorAddress.slice(-8)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyAddress}
                  className="h-auto p-1"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <a
                  href={`https://etherscan.io/address/${creatorAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Quick Stats */}
              {stats && (
                <div className="grid grid-cols-4 gap-2 pt-4 border-t">
                  <div>
                    <p className="text-2xl font-bold">{stats.totalSales}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{parseFloat(stats.totalVolume24h).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">24h Vol</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.collections.length}</p>
                    <p className="text-xs text-muted-foreground">Collections</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.highestPrice}</p>
                    <p className="text-xs text-muted-foreground">High</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Marketplace Stats Cards */}
      {collectionAddress && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Marketplace Statistics</h2>
          <MarketplaceStats collectionAddress={collectionAddress} />
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="royalties">Royalties</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <MarketplaceActivity
            collectionAddress={collectionAddress}
            title="Recent Marketplace Activity"
            limit={20}
          />
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-4">
          {isLoadingEarnings ? (
            <Card>
              <CardContent className="p-6 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
              </CardContent>
            </Card>
          ) : earnings ? (
            <CreatorEarningsPanel />
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">No earnings data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Royalties Tab */}
        <TabsContent value="royalties" className="space-y-4">
          <RoyaltiesPanel />
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About {creatorName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Creator Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wallet Address:</span>
                    <span className="font-mono">{creatorAddress.slice(0, 10)}...{creatorAddress.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collections:</span>
                    <span>{stats?.collections.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Sales:</span>
                    <span>{stats?.totalSales || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Volume:</span>
                    <span>{parseFloat(stats?.totalVolume30d || '0').toFixed(2)} ETH (30d)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Marketplace Presence</h4>
                {collectionAddress && (
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={`https://opensea.io/collection/${collectionAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        OpenSea
                        <ExternalLink className="ml-1 w-3 h-3" />
                      </Badge>
                    </a>
                    <a
                      href={`https://rarible.com/collection/${collectionAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        Rarible
                        <ExternalLink className="ml-1 w-3 h-3" />
                      </Badge>
                    </a>
                    <a
                      href={`https://blur.io/collection/${collectionAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        Blur
                        <ExternalLink className="ml-1 w-3 h-3" />
                      </Badge>
                    </a>
                  </div>
                )}
              </div>

              {creatorBio && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{creatorBio}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Want to support {creatorName}?</p>
              <p className="text-sm text-muted-foreground">Collect their NFTs or send them a gift</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <MessageCircle className="mr-2 w-4 h-4" />
                Send Gift
              </Button>
              <Button>
                <ShoppingCart className="mr-2 w-4 h-4" />
                View Collections
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
