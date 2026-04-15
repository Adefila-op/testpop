/**
 * Marketplace API Integrations
 * Unified interface for OpenSea, Rarible, and Blur marketplace data
 */

export type Marketplace = 'OPENSEA' | 'RARIBLE' | 'BLUR';

export interface MarketplaceConfig {
  name: string;
  apiKey?: string;
  apiUrl: string;
  chainId: number;
}

export interface MarketplaceCollection {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  floorPrice: string;
  floorPriceEth: string;
  volume24h: string;
  volume7d: string;
  volume30d: string;
  owners: number;
  items: number;
  verified: boolean;
  royaltyBps: number;
}

export interface MarketplaceSale {
  id: string;
  tokenId: string;
  collectionAddress: string;
  seller: string;
  buyer: string;
  price: string;
  priceEth: string;
  currency: string;
  timestamp: string;
  transactionHash: string;
  marketplace: Marketplace;
}

export interface MarketplaceOffer {
  id: string;
  tokenId: string;
  collectionAddress: string;
  offerer: string;
  price: string;
  priceEth: string;
  expiresAt: string;
  status: 'active' | 'accepted' | 'cancelled' | 'expired';
  marketplace: Marketplace;
}

// OpenSea API Configuration
export const OPENSEA_CONFIG: MarketplaceConfig = {
  name: 'OpenSea',
  apiUrl: process.env.VITE_OPENSEA_API_URL || 'https://api.opensea.io/api/v2',
  apiKey: process.env.VITE_OPENSEA_API_KEY,
  chainId: parseInt(process.env.VITE_CHAIN_ID || '31337'),
};

// Rarible API Configuration
export const RARIBLE_CONFIG: MarketplaceConfig = {
  name: 'Rarible',
  apiUrl: process.env.VITE_RARIBLE_API_URL || 'https://api.rarible.org/v0.1',
  apiKey: process.env.VITE_RARIBLE_API_KEY,
  chainId: parseInt(process.env.VITE_CHAIN_ID || '31337'),
};

// Blur API Configuration
export const BLUR_CONFIG: MarketplaceConfig = {
  name: 'Blur',
  apiUrl: process.env.VITE_BLUR_API_URL || 'https://api.blur.io/api/v1',
  apiKey: process.env.VITE_BLUR_API_KEY,
  chainId: parseInt(process.env.VITE_CHAIN_ID || '31337'),
};

/**
 * Fetch collection data from OpenSea
 */
export async function fetchOpenSeaCollection(collectionSlug: string): Promise<MarketplaceCollection | null> {
  try {
    const response = await fetch(
      `${OPENSEA_CONFIG.apiUrl}/collections/${collectionSlug}`,
      {
        headers: OPENSEA_CONFIG.apiKey ? { 'x-api-key': OPENSEA_CONFIG.apiKey } : {},
      }
    );

    if (!response.ok) {
      console.warn(`OpenSea collection fetch failed: ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    return {
      id: data.collection,
      name: data.name,
      slug: collectionSlug,
      imageUrl: data.image_url || '',
      floorPrice: data.floor_price?.toString() || '0',
      floorPriceEth: data.floor_price?.toString() || '0',
      volume24h: data.one_day_volume?.toString() || '0',
      volume7d: data.seven_day_volume?.toString() || '0',
      volume30d: data.thirty_day_volume?.toString() || '0',
      owners: data.unique_creator_count || 0,
      items: data.total_supply || 0,
      verified: data.safelist_status === 'verified',
      royaltyBps: parseInt(data.owner_fees?.[0]?.basis_points || '0'),
    };
  } catch (error) {
    console.error('OpenSea collection fetch error:', error);
    return null;
  }
}

/**
 * Fetch sales history from OpenSea
 */
export async function fetchOpenSeaSales(
  collectionSlug: string,
  limit: number = 20
): Promise<MarketplaceSale[]> {
  try {
    const response = await fetch(
      `${OPENSEA_CONFIG.apiUrl}/events?collection_slug=${collectionSlug}&event_type=sale&limit=${limit}`,
      {
        headers: OPENSEA_CONFIG.apiKey ? { 'x-api-key': OPENSEA_CONFIG.apiKey } : {},
      }
    );

    if (!response.ok) return [];

    const data = await response.json();

    return (data.asset_events || []).map((event: any) => ({
      id: event.event_timestamp,
      tokenId: event.asset?.token_id || '',
      collectionAddress: event.asset?.asset_contract?.address || '',
      seller: event.seller?.address || '',
      buyer: event.transaction?.from_address || '',
      price: event.total_price?.toString() || '0',
      priceEth: (parseInt(event.total_price || '0') / 1e18).toString(),
      currency: event.payment_token?.symbol || 'ETH',
      timestamp: event.event_timestamp,
      transactionHash: event.transaction?.transaction_hash || '',
      marketplace: 'OPENSEA' as Marketplace,
    }));
  } catch (error) {
    console.error('OpenSea sales fetch error:', error);
    return [];
  }
}

/**
 * Fetch collection data from Rarible
 */
export async function fetchRaribleCollection(
  collectionAddress: string
): Promise<MarketplaceCollection | null> {
  try {
    const response = await fetch(
      `${RARIBLE_CONFIG.apiUrl}/collections/${collectionAddress}`,
      {
        headers: RARIBLE_CONFIG.apiKey ? { 'x-api-key': RARIBLE_CONFIG.apiKey } : {},
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    return {
      id: data.id,
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      imageUrl: data.image || '',
      floorPrice: data.best_offer?.value?.toString() || '0',
      floorPriceEth: (parseInt(data.best_offer?.value || '0') / 1e18).toString(),
      volume24h: data.statistics?.volume_1d?.toString() || '0',
      volume7d: data.statistics?.volume_7d?.toString() || '0',
      volume30d: data.statistics?.volume_30d?.toString() || '0',
      owners: data.owner_count || 0,
      items: data.supply || 0,
      verified: data.verified || false,
      royaltyBps: data.royalties?.[0]?.value || 0,
    };
  } catch (error) {
    console.error('Rarible collection fetch error:', error);
    return null;
  }
}

/**
 * Fetch sales from Rarible
 */
export async function fetchRaribleSales(
  collectionAddress: string,
  limit: number = 20
): Promise<MarketplaceSale[]> {
  try {
    const response = await fetch(
      `${RARIBLE_CONFIG.apiUrl}/activities?collection=${collectionAddress}&type=SELL&limit=${limit}`,
      {
        headers: RARIBLE_CONFIG.apiKey ? { 'x-api-key': RARIBLE_CONFIG.apiKey } : {},
      }
    );

    if (!response.ok) return [];

    const data = await response.json();

    return (data.activities || []).map((activity: any) => ({
      id: activity.id,
      tokenId: activity.nft?.token_id || '',
      collectionAddress: activity.nft?.collection || '',
      seller: activity.from || '',
      buyer: activity.to || '',
      price: activity.price?.toString() || '0',
      priceEth: (parseInt(activity.price || '0') / 1e18).toString(),
      currency: activity.price_currency || 'ETH',
      timestamp: activity.date,
      transactionHash: activity.transaction_hash || '',
      marketplace: 'RARIBLE' as Marketplace,
    }));
  } catch (error) {
    console.error('Rarible sales fetch error:', error);
    return [];
  }
}

/**
 * Fetch collection stats from Blur
 */
export async function fetchBlurCollection(
  collectionAddress: string
): Promise<MarketplaceCollection | null> {
  try {
    const response = await fetch(
      `${BLUR_CONFIG.apiUrl}/collections/stats/${collectionAddress}`,
      {
        headers: BLUR_CONFIG.apiKey ? { 'x-api-key': BLUR_CONFIG.apiKey } : {},
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    return {
      id: data.address,
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      imageUrl: data.image_url || '',
      floorPrice: data.floor_price?.toString() || '0',
      floorPriceEth: (parseInt(data.floor_price || '0') / 1e18).toString(),
      volume24h: data.volume_24h?.toString() || '0',
      volume7d: data.volume_7d?.toString() || '0',
      volume30d: data.volume_30d?.toString() || '0',
      owners: data.unique_owners || 0,
      items: data.total_items || 0,
      verified: data.is_verified || false,
      royaltyBps: data.royalty_bps || 0,
    };
  } catch (error) {
    console.error('Blur collection fetch error:', error);
    return null;
  }
}

/**
 * Fetch sales from Blur
 */
export async function fetchBlurSales(
  collectionAddress: string,
  limit: number = 20
): Promise<MarketplaceSale[]> {
  try {
    const response = await fetch(
      `${BLUR_CONFIG.apiUrl}/collections/${collectionAddress}/sales?limit=${limit}`,
      {
        headers: BLUR_CONFIG.apiKey ? { 'x-api-key': BLUR_CONFIG.apiKey } : {},
      }
    );

    if (!response.ok) return [];

    const data = await response.json();

    return (data.sales || []).map((sale: any) => ({
      id: sale.id,
      tokenId: sale.token_id,
      collectionAddress: collectionAddress,
      seller: sale.seller,
      buyer: sale.buyer,
      price: sale.price?.toString() || '0',
      priceEth: (parseInt(sale.price || '0') / 1e18).toString(),
      currency: 'ETH',
      timestamp: sale.timestamp,
      transactionHash: sale.tx_hash || '',
      marketplace: 'BLUR' as Marketplace,
    }));
  } catch (error) {
    console.error('Blur sales fetch error:', error);
    return [];
  }
}

/**
 * Unified marketplace collection fetch
 * Tries primary marketplace, falls back to others
 */
export async function fetchMarketplaceCollection(
  collectionAddress: string,
  primary: Marketplace = 'OPENSEA'
): Promise<MarketplaceCollection | null> {
  const strategies = {
    OPENSEA: () => fetchOpenSeaCollection(collectionAddress),
    RARIBLE: () => fetchRaribleCollection(collectionAddress),
    BLUR: () => fetchBlurCollection(collectionAddress),
  };

  // Try primary marketplace first
  const primaryFetch = strategies[primary];
  if (primaryFetch) {
    const result = await primaryFetch();
    if (result) return result;
  }

  // Fallback to other marketplaces
  const fallbacks = Object.entries(strategies).filter(([key]) => key !== primary);

  for (const [, fetch] of fallbacks) {
    const result = await fetch();
    if (result) return result;
  }

  return null;
}

/**
 * Unified marketplace sales fetch
 * Aggregates sales from multiple marketplaces
 */
export async function fetchMarketplaceSales(
  collectionAddress: string,
  limit: number = 20
): Promise<MarketplaceSale[]> {
  const [openSeaSales, raribleSales, blurSales] = await Promise.allSettled([
    fetchOpenSeaSales(collectionAddress, limit),
    fetchRaribleSales(collectionAddress, limit),
    fetchBlurSales(collectionAddress, limit),
  ]);

  const sales: MarketplaceSale[] = [];

  if (openSeaSales.status === 'fulfilled') {
    sales.push(...openSeaSales.value);
  }
  if (raribleSales.status === 'fulfilled') {
    sales.push(...raribleSales.value);
  }
  if (blurSales.status === 'fulfilled') {
    sales.push(...blurSales.value);
  }

  // Sort by timestamp descending
  return sales.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, limit);
}

/**
 * Get creator URL on marketplace
 */
export function getMarketplaceCreatorUrl(
  creatorAddress: string,
  marketplace: Marketplace
): string {
  const baseUrls: Record<Marketplace, string> = {
    OPENSEA: 'https://opensea.io',
    RARIBLE: 'https://rarible.com',
    BLUR: 'https://blur.io',
  };

  const paths: Record<Marketplace, string> = {
    OPENSEA: `/user/${creatorAddress}`,
    RARIBLE: `/user/${creatorAddress}/collections`,
    BLUR: `/user/${creatorAddress}`,
  };

  return `${baseUrls[marketplace]}${paths[marketplace]}`;
}

/**
 * Get collection URL on marketplace
 */
export function getMarketplaceCollectionUrl(
  collectionAddress: string,
  marketplace: Marketplace
): string {
  const baseUrls: Record<Marketplace, string> = {
    OPENSEA: 'https://opensea.io',
    RARIBLE: 'https://rarible.com',
    BLUR: 'https://blur.io',
  };

  const paths: Record<Marketplace, string> = {
    OPENSEA: `/collection/${collectionAddress}`,
    RARIBLE: `/collection/${collectionAddress}`,
    BLUR: `/collection/${collectionAddress}`,
  };

  return `${baseUrls[marketplace]}${paths[marketplace]}`;
}
