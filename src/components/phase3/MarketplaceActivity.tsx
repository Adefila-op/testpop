/**
 * Marketplace Activity Component - Display recent marketplace sales
 * Shows real-time activity from OpenSea, Rarible, and Blur
 */

import { useState } from 'react';
import { useMarketplaceStats } from '@/hooks/useMarketplaceStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, ExternalLink, TrendingDown } from 'lucide-react';
import { Marketplace, MarketplaceSale } from '@/lib/marketplaceIntegration';

interface MarketplaceActivityProps {
  collectionAddress?: string;
  creatorAddress?: string;
  title?: string;
  limit?: number;
}

export function MarketplaceActivity({
  collectionAddress,
  creatorAddress,
  title = 'Marketplace Activity',
  limit = 20,
}: MarketplaceActivityProps) {
  const { recentSales, isLoading, error } = useMarketplaceStats(collectionAddress);
  const [sortBy, setSortBy] = useState<'recent' | 'price'>('recent');
  const [selectedMarketplace, setSelectedMarketplace] = useState<Marketplace | 'ALL'>('ALL');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            Failed to load marketplace activity
          </div>
        </CardContent>
      </Card>
    );
  }

  const marketplaces: Marketplace[] = ['OPENSEA', 'RARIBLE', 'BLUR'];

  // Filter sales
  const filteredSales = recentSales
    ? recentSales.filter((sale) =>
        selectedMarketplace === 'ALL' ? true : sale.marketplace === selectedMarketplace
      )
    : [];

  // Sort sales
  const sortedSales = [...filteredSales].sort((a, b) => {
    if (sortBy === 'price') {
      return parseInt(b.price || '0') - parseInt(a.price || '0');
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const displaySales = sortedSales.slice(0, limit);

  const marketplaceCounts = {
    ALL: filteredSales.length,
    OPENSEA: filteredSales.filter((s) => s.marketplace === 'OPENSEA').length,
    RARIBLE: filteredSales.filter((s) => s.marketplace === 'RARIBLE').length,
    BLUR: filteredSales.filter((s) => s.marketplace === 'BLUR').length,
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {filteredSales.length} recent {selectedMarketplace === 'ALL' ? 'sales' : selectedMarketplace.toLowerCase() + ' sales'}
            </CardDescription>
          </div>
          <Badge variant="outline">{filteredSales.length}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter Tabs */}
        <Tabs defaultValue="ALL" onValueChange={(v) => setSelectedMarketplace(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ALL" className="text-xs">
              All
              <span className="ml-1 text-xs">{marketplaceCounts.ALL}</span>
            </TabsTrigger>
            <TabsTrigger value="OPENSEA" className="text-xs">
              OpenSea
              <span className="ml-1 text-xs">{marketplaceCounts.OPENSEA}</span>
            </TabsTrigger>
            <TabsTrigger value="RARIBLE" className="text-xs">
              Rarible
              <span className="ml-1 text-xs">{marketplaceCounts.RARIBLE}</span>
            </TabsTrigger>
            <TabsTrigger value="BLUR" className="text-xs">
              Blur
              <span className="ml-1 text-xs">{marketplaceCounts.BLUR}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sort Options */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('recent')}
            className={`text-sm px-3 py-1 rounded border transition-colors ${
              sortBy === 'recent'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-muted-foreground/50 hover:bg-muted'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortBy('price')}
            className={`text-sm px-3 py-1 rounded border transition-colors ${
              sortBy === 'price'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-muted-foreground/50 hover:bg-muted'
            }`}
          >
            Price
          </button>
        </div>

        {/* Sales List */}
        {displaySales.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {displaySales.map((sale) => (
              <SaleRow key={sale.id} sale={sale} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>No marketplace activity found</p>
          </div>
        )}

        {/* View More Link */}
        {displaySales.length >= limit && (
          <div className="pt-2 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Showing {displaySales.length} of {filteredSales.length} sales
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Individual Sale Row Component
 */
function SaleRow({ sale }: { sale: MarketplaceSale }) {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* From To */}
          <div className="flex items-center gap-1 text-sm">
            <a
              href={`https://etherscan.io/address/${sale.seller}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono text-xs"
            >
              {formatAddress(sale.seller)}
            </a>
            <span className="text-muted-foreground">→</span>
            <a
              href={`https://etherscan.io/address/${sale.buyer}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono text-xs"
            >
              {formatAddress(sale.buyer)}
            </a>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {sale.marketplace}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDate(sale.timestamp)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-2">
        {/* Price */}
        <div className="text-right">
          <p className="font-bold text-sm">{parseFloat(sale.priceEth).toFixed(4)} ETH</p>
          <a
            href={`https://etherscan.io/tx/${sale.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Tx
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Marketplace Statistics Display
 */
export function MarketplaceStats({
  collectionAddress,
}: {
  collectionAddress?: string;
}) {
  const { stats, isLoading, error } = useMarketplaceStats(collectionAddress);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Loader2 className="w-8 h-8 animate-spin" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  const statCards = [
    {
      label: 'Total Sales',
      value: stats.totalSales.toString(),
      subtext: 'All time',
    },
    {
      label: '24h Volume',
      value: `${stats.totalVolume24h} ETH`,
      subtext: 'Last 24 hours',
    },
    {
      label: 'Average Price',
      value: `${stats.averagePrice} ETH`,
      subtext: 'Mean sale price',
    },
    {
      label: 'Highest Sale',
      value: `${stats.highestPrice} ETH`,
      subtext: 'Max price',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{stat.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
