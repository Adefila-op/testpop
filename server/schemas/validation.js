// server/schemas/validation.js
// Comprehensive input validation schemas using Zod

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const WalletSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address')
  .transform(v => v.toLowerCase());

export const EthereumAddressSchema = WalletSchema;

export const PriceSchema = z.number()
  .positive('Price must be greater than 0')
  .finite('Price must be a finite number')
  .max(1000000, 'Price exceeds maximum (1M ETH)')
  .transform(v => Number(v.toFixed(8))); // 8 decimal places for ETH

export const URLSchema = z.string()
  .url('Invalid URL')
  .max(1024, 'URL too long');

export const FilenameSchema = z.string()
  .min(1, 'Filename required')
  .max(255, 'Filename too long')
  .regex(/^[a-zA-Z0-9._\-]+$/, 'Invalid filename characters');

export const UUIDSchema = z.string()
  .uuid('Invalid UUID format');

// ============================================================================
// Authentication Schemas
// ============================================================================

export const ChallengeRequestSchema = z.object({
  wallet: WalletSchema,
});

export const VerifySignatureSchema = z.object({
  wallet: WalletSchema,
  signature: z.string()
    .startsWith('0x', 'Signature must start with 0x')
    .regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature hex format'),
  challenge: z.string()
    .min(10, 'Invalid challenge'),
});

// ============================================================================
// Artist Management Schemas
// ============================================================================

export const UpdateArtistProfileSchema = z.object({
  name: z.string()
    .min(1, 'Name required')
    .max(255, 'Name too long'),
  bio: z.string()
    .max(5000, 'Bio too long')
    .optional(),
  image_url: URLSchema.optional(),
  twitter_url: URLSchema.optional(),
  instagram_url: URLSchema.optional(),
  website_url: URLSchema.optional(),
  contract_address: EthereumAddressSchema.optional(),
  shares_enabled: z.boolean().default(true),
});

export const SetContractAddressSchema = z.object({
  contract_address: EthereumAddressSchema,
  contract_type: z.enum(['drop', 'store', 'escrow']),
});

// ============================================================================
// Product Schemas
// ============================================================================

export const CreateProductSchema = z.object({
  name: z.string()
    .min(1, 'Product name required')
    .max(255, 'Product name too long'),
  description: z.string()
    .max(10000, 'Description too long')
    .optional(),
  price_eth: PriceSchema,
  supply: z.number()
    .int('Supply must be integer')
    .min(1, 'Supply must be at least 1')
    .max(1000000, 'Supply too high'),
  image_url: URLSchema.optional(),
  metadata: z.record(z.any()).optional(),
  contract_address: EthereumAddressSchema.optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// ============================================================================
// Drop Schemas
// ============================================================================

export const CreateDropSchema = z.object({
  title: z.string()
    .min(1, 'Drop title required')
    .max(255, 'Drop title too long'),
  description: z.string()
    .max(10000, 'Description too long')
    .optional(),
  price_eth: PriceSchema,
  supply: z.number()
    .int('Supply must be integer')
    .min(1, 'Supply must be at least 1')
    .max(1000000, 'Supply too high'),
  image_url: URLSchema.optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export const UpdateDropSchema = CreateDropSchema.partial();

// ============================================================================
// Order Schemas
// ============================================================================

export const CreateOrderSchema = z.object({
  product_ids: z.array(UUIDSchema).min(1, 'At least one product required'),
  quantities: z.array(z.number().int().positive()).min(1),
  total_price_eth: PriceSchema,
  tx_hash: z.string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  buyer_wallet: WalletSchema,
  metadata: z.record(z.any()).optional(),
});

export const VerifyOrderSchema = z.object({
  tx_hash: z.string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  expected_amount: PriceSchema,
  buyer_wallet: WalletSchema,
});

// ============================================================================
// Whitelist Schemas
// ============================================================================

export const AddWhitelistSchema = z.object({
  wallet: WalletSchema,
  reason: z.string()
    .max(500, 'Reason too long')
    .optional(),
  status: z.enum(['approved', 'pending', 'rejected']).default('pending'),
});

// ============================================================================
// File Upload Schemas
// ============================================================================

export const FileUploadSchema = z.object({
  filename: FilenameSchema,
  // File type validated by MIME type check
  mimetype: z.string()
    .refine(
      type => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(type),
      'Unsupported file type'
    ),
  size: z.number()
    .max(50 * 1024 * 1024, 'File too large (max 50MB)'),
});

export const JSONUploadSchema = z.object({
  data: z.record(z.any()),
  filename: FilenameSchema.optional(),
});

// ============================================================================
// Notification Schemas
// ============================================================================

export const CreateNotificationSchema = z.object({
  creator_wallet: WalletSchema,
  event_type: z.enum(['drop_minted', 'purchase_completed', 'artist_approved', 'subscription_received']),
  title: z.string().max(255),
  message: z.string().max(5000),
  data: z.record(z.any()).optional(),
});

export const MarkNotificationReadSchema = z.object({
  notification_id: UUIDSchema,
  read: z.boolean(),
});

// ============================================================================
// Fan Hub Schemas
// ============================================================================

export const CreateFanHubPostSchema = z.object({
  channel_id: UUIDSchema,
  content: z.string()
    .min(1, 'Content required')
    .max(10000, 'Content too long'),
  image_url: URLSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export const CreateFanHubThreadSchema = z.object({
  recipient_wallet: WalletSchema,
  subject: z.string().max(255),
  message: z.string().max(5000),
});

// ============================================================================
// Validation Middleware
// ============================================================================

export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }
      next(error);
    }
  };
}

// ============================================================================
// Export all schemas for use in routes
// ============================================================================

export default {
  ChallengeRequestSchema,
  VerifySignatureSchema,
  UpdateArtistProfileSchema,
  SetContractAddressSchema,
  CreateProductSchema,
  UpdateProductSchema,
  CreateDropSchema,
  UpdateDropSchema,
  CreateOrderSchema,
  VerifyOrderSchema,
  AddWhitelistSchema,
  FileUploadSchema,
  JSONUploadSchema,
  CreateNotificationSchema,
  MarkNotificationReadSchema,
  CreateFanHubPostSchema,
  CreateFanHubThreadSchema,
};
