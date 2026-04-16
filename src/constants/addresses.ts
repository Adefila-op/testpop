/**
 * Smart Contract Addresses
 * Network: Base Sepolia (ChainID: 84532)
 * Deployment Date: April 15, 2026
 */

export const NETWORK_CONFIG = {
  chainId: 84532,
  name: 'Base Sepolia',
  rpc: 'https://sepolia.base.org',
};

export const CONTRACT_ADDRESSES = {
  // Referral Management
  REFERRAL_MANAGER: '0x82160a2A2d8C5FC5388FAe88adb56EE69635b5b6' as const,

  // Payout Distribution
  PAYOUT_DISTRIBUTOR: '0x407B43E780DA5cd077fEBBBACDE7D5Dd61c61640' as const,

  // Product Store (Direct sales & auctions)
  PRODUCT_STORE: '0x4840c1c112441e51b167fEA96E8dDC461DEd3e00' as const,

  // Auction Management
  AUCTION_MANAGER: '0xAe5f9524d3fdF6194df30C14d64B814f080C91C3' as const,

  // Royalty Distribution
  ROYALTY_MANAGER: '0x321ff7622C9D0Bb4faE4B3b73029822E6AaEA238' as const,

  // Artist Profile & Minting
  ARTIST_PROFILE_MINTER: '0xddA7e602207ff08Ee3cd82B333DA3f28b16A9433' as const,
} as const;

// Convenience exports for commonly used addresses
export const PAYOUT_DISTRIBUTOR_ADDRESS = CONTRACT_ADDRESSES.PAYOUT_DISTRIBUTOR;
export const ROYALTY_MANAGER_ADDRESS = CONTRACT_ADDRESSES.ROYALTY_MANAGER;
export const PRODUCT_STORE_ADDRESS = CONTRACT_ADDRESSES.PRODUCT_STORE;
export const AUCTION_MANAGER_ADDRESS = CONTRACT_ADDRESSES.AUCTION_MANAGER;
export const REFERRAL_MANAGER_ADDRESS = CONTRACT_ADDRESSES.REFERRAL_MANAGER;
export const ARTIST_PROFILE_MINTER_ADDRESS = CONTRACT_ADDRESSES.ARTIST_PROFILE_MINTER;
