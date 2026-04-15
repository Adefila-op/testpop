/**
 * Marketplace Stats Hook - Creator marketplace data
 * Aggregates sales, offers, and stats from OpenSea, Rarible, Blur
 */

import { useQuery } from '@tanstack/react-query';
import { 
  fetchMarketplaceCollection,
  fetchMarketplaceSales,
  MarketplaceCollection,
  MarketplaceSale,
  Marketplace,
} from '@/lib/marketplaceIntegration';

export interface CreatorMarketplaceStats {
  totalVolume24h: string;
  totalVolume7d: string;
  totalVolume30d: string;
  totalSales: number;
  averagePrice: string;
  highestPrice: string;
  lowestPrice: string;
  collections: MarketplaceCollection[];
  recentSales: MarketplaceSale[];
}

export interface UseMarketplaceStatsReturn {
  stats: CreatorMarketplaceStats | null;
  collections: MarketplaceCollection[] | null;
  recentSales: MarketplaceSale[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch marketplace stats for a collection
 */
export function useMarketplaceStats(
  collectionAddress: string | null,
  enabled: boolean = true
): UseMarketplaceStatsReturn {
  const {
    data: collectionData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marketplace', 'collection', collectionAddress],
    queryFn: async () => {
      if (!collectionAddress) return null;

      const [collection, sales] = await Promise.all([
        fetchMarketplaceCollection(collectionAddress),
        fetchMarketplaceSales(collectionAddress, 50),
      ]);

      return { collection, sales };
    },
    enabled: !!collectionAddress && enabled,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });

  // Calculate stats
  const stats = collectionData?.sales && collectionData.sales.length > 0
    ? {
        totalVolume24h: calculateVolume24h(collectionData.sales),
        totalVolume7d: calculateVolume7d(collectionData.sales),
        totalVolume30d: calculateVolume30d(collectionData.sales),
        totalSales: collectionData.sales.length,
        averagePrice: calculateAveragePrice(collectionData.sales),
        highestPrice: calculateHighestPrice(collectionData.sales),
        lowestPrice: calculateLowestPrice(collectionData.sales),
        collections: collectionData.collection ? [collectionData.collection] : [],
        recentSales: collectionData.sales.slice(0, 10),
      }
    : null;

  return {
    stats: stats || null,
    collections: collectionData?.collection ? [collectionData.collection] : null,
    recentSales: collectionData?.sales || null,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

/**
 * Calculate volume in last 24 hours
 */
function calculateVolume24h(sales: MarketplaceSale[]): string {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const volume = sales
    .filter((sale) => new Date(sale.timestamp).getTime() > oneDayAgo)
    .reduce((sum, sale) => sum + BigInt(sale.price || 0), BigInt(0));

  return (parseInt(volume.toString()) / 1e18).toFixed(4);
}

/**
 * Calculate volume in last 7 days
 */
function calculateVolume7d(sales: MarketplaceSale[]): string {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const volume = sales
    .filter((sale) => new Date(sale.timestamp).getTime() > sevenDaysAgo)
    .reduce((sum, sale) => sum + BigInt(sale.price || 0), BigInt(0));

  return (parseInt(volume.toString()) / 1e18).toFixed(4);
}

/**
 * Calculate volume in last 30 days
 */
function calculateVolume30d(sales: MarketplaceSale[]): string {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const volume = sales
    .filter((sale) => new Date(sale.timestamp).getTime() > thirtyDaysAgo)
    .reduce((sum, sale) => sum + BigInt(sale.price || 0), BigInt(0));

  return (parseInt(volume.toString()) / 1e18).toFixed(4);
}

/**
 * Calculate average sale price
 */
function calculateAveragePrice(sales: MarketplaceSale[]): string {
  if (sales.length === 0) return '0';

  const total = sales.reduce((sum, sale) => sum + BigInt(sale.price || 0), BigInt(0));
  const average = parseInt(total.toString()) / sales.length / 1e18;

  return average.toFixed(4);
}

/**
 * Calculate highest sale price
 */
function calculateHighestPrice(sales: MarketplaceSale[]): string {
  if (sales.length === 0) return '0';

  const highest = Math.max(...sales.map((sale) => parseInt(sale.price || 0)));
  return (highest / 1e18).toFixed(4);
}

/**
 * Calculate lowest sale price
 */
function calculateLowestPrice(sales: MarketplaceSale[]): string {
  if (sales.length === 0) return '0';

  const prices = sales
    .map((sale) => parseInt(sale.price || 0))
    .filter((price) => price > 0);

  if (prices.length === 0) return '0';

  const lowest = Math.min(...prices);
  return (lowest / 1e18).toFixed(4);
}

/**
 * Hook to fetch creator's active collections across marketplaces
 */
export function useCreatorCollections(
  creatorAddress: string | null,
  collectionAddresses: string[] = []
) {
  const {
    data: collections,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['marketplace', 'creator', 'collections', creatorAddress],
    queryFn: async () => {
      if (!creatorAddress || collectionAddresses.length === 0) return [];

      const results = await Promise.allSettled(
        collectionAddresses.map((addr) => fetchMarketplaceCollection(addr))
      );

      return results
        .filter((r) => r.status === 'fulfilled' && r.value !== null)
        .map((r) => (r as PromiseFulfilledResult<MarketplaceCollection | null>).value)
        .filter((c): c is MarketplaceCollection => c !== null);
    },
    enabled: !!creatorAddress && collectionAddresses.length > 0,
    staleTime: 120000, // 2 minutes
  });

  return {
    collections: collections || [],
    isLoading,
    error: error instanceof Error ? error : null,
  };
}

/**
 * Marketplace stats for multiple collections
 */
export function useMultipleMarketplaceStats(
  collectionAddresses: string[] = []
) {
  const {
    data: statsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['marketplace', 'multi-stats', collectionAddresses],
    queryFn: async () => {
      if (collectionAddresses.length === 0) return [];

      const allResults = await Promise.allSettled(
        collectionAddresses.map(async (addr) => {
          const sales = await fetchMarketplaceSales(addr, 50);
          return { address: addr, sales };
        })
      );

      return allResults
        .filter((r) => r.status === 'fulfilled')
        .map((r) => {
          const result = (r as PromiseFulfilledResult<{ address: string; sales: MarketplaceSale[] }>).value;
          return {
            address: result.address,
            totalVolume: calculateTotalVolume(result.sales),
            totalSales: result.sales.length,
            averagePrice: calculateAveragePrice(result.sales),
            sales: result.sales.slice(0, 5),
          };
        });
    },
    enabled: collectionAddresses.length > 0,
    staleTime: 120000,
  });

  return {
    stats: statsData || [],
    isLoading,
    error: error instanceof Error ? error : null,
  };
}

/**
 * Helper: Total volume from sales
 */
function calculateTotalVolume(sales: MarketplaceSale[]): string {
  const total = sales.reduce((sum, sale) => sum + BigInt(sale.price || 0), BigInt(0));
  return (parseInt(total.toString()) / 1e18).toFixed(4);
}
