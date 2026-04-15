/**
 * Phase 2 Frontend Integration - Barrel Exports
 * Centralized export point for all Phase 2 hooks and components
 */

// Transaction Management
export { useTransactionState } from './useTransactionState';
export type { TransactionState, UseTransactionStateReturn } from './useTransactionState';

// Feature Hooks
export { useProducts, useProduct } from './useProducts';
export type { Product, CreateProductInput, PurchaseEstimate, UseProductsReturn } from './useProducts';

export { useAuctions, useAuction } from './useAuctions';
export type { Auction, AuctionBid, CreateAuctionInput, PlaceBidInput, UseAuctionsReturn } from './useAuctions';

export { useGifts } from './useGifts';
export type { Gift, CreateGiftInput, ClaimGiftInput, UseGiftsReturn } from './useGifts';

export { useCreator } from './useCreator';
export type {
  CreatorEarnings,
  PayoutSettings,
  PayoutRecord,
  Collaborator,
  UseCreatorReturn,
} from './useCreator';

export { useRoyalties, useTokenRoyalties } from './useRoyalties';
export type {
  RoyaltyConfig,
  RoyaltySale,
  RoyaltyStats,
  UseRoyaltiesReturn,
} from './useRoyalties';
