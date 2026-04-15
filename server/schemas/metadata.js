/**
 * Metadata Schemas for POPUP Platform
 * Defines Zod validators for all JSONB metadata fields
 * Used to enforce type safety across frontend/backend
 */

import { z } from "zod";

/**
 * IPFS URI Schema - Validates proper IPFS format
 * Accepts: ipfs://bafy..., ipfs://Qm..., or bare CID
 */
export const ipfsUriSchema = z
  .string()
  .regex(/^ipfs:\/\/(bafy[a-z2-7]+|bafk[a-z2-7]+|Qm[1-9A-HJ-NP-Za-km-z]{44,})$/i, {
    message: "Must be valid IPFS URI format: ipfs://bafy... or ipfs://Qm...",
  })
  .or(
    z
      .string()
      .regex(/^(bafy[a-z2-7]+|bafk[a-z2-7]+|Qm[1-9A-HJ-NP-Za-km-z]{44,})$/i, {
        message: "Must be valid IPFS CID (bare or with ipfs:// prefix)",
      })
      .transform((cid) => `ipfs://${cid}`)
  );

/**
 * Portfolio Item Schema
 * Stored in: artists.portfolio (JSONB array)
 * Example: [{ image_url: "ipfs://bafy...", title: "Artwork 1", ... }]
 */
export const portfolioItemSchema = z.object({
  image_url: z
    .string()
    .url()
    .or(ipfsUriSchema)
    .describe("Image URL (HTTP or IPFS)"),
  title: z.string().max(200).optional().describe("Portfolio item title"),
  description: z.string().max(1000).optional().describe("Portfolio item description"),
  link_url: z.string().url().optional().describe("External link to artwork"),
  metadata: z.record(z.any()).optional().describe("Additional metadata"),
});

export const portfolioSchema = z
  .array(portfolioItemSchema)
  .max(50)
  .describe("Artist portfolio items (max 50)");

/**
 * Product Metadata Schema
 * Stored in: products.metadata (JSONB)
 * Contains extended product attributes
 */
export const productMetadataSchema = z
  .object({
    // Core product info
    name: z.string().min(1).max(200).optional().describe("Product display name"),
    description: z.string().max(5000).optional().describe("Detailed product description"),
    tags: z.array(z.string()).max(20).optional().describe("Product tags for discovery"),

    // Pricing & availability
    price_eth: z
      .number()
      .positive()
      .max(999999)
      .optional()
      .describe("Price in ETH (override if different)"),
    currency: z.enum(["ETH", "USD"]).optional().describe("Price currency"),
    available_quantity: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Number of copies available"),

    // Royalties & splits
    royalty_percent: z
      .number()
      .min(0)
      .max(50)
      .optional()
      .describe("Royalty percentage on resale"),
    royalty_recipient: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/i)
      .optional()
      .describe("Wallet receiving royalties"),

    // Asset details
    asset_type: z
      .enum(["image", "video", "audio", "pdf", "3d-model", "html", "other"])
      .optional()
      .describe("Type of deliverable asset"),
    file_size_bytes: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Delivery file size in bytes"),
    mime_type: z.string().optional().describe("MIME type of deliverable"),

    // Licensing
    license_type: z
      .enum(["exclusive", "limited", "open", "cc-by", "cc-by-sa"])
      .optional()
      .describe("License type for use"),
    license_url: z.string().url().optional().describe("License URL or details"),

    // Extra metadata
    created_at_unix: z.number().optional().describe("Creation timestamp (Unix)"),
    external_url: z.string().url().optional().describe("External reference URL"),
    custom_fields: z.record(z.any()).optional().describe("Custom flexible fields"),
  })
  .strict()
  .describe("Product extended metadata");

/**
 * Drop/Creative Release Metadata Schema
 * Stored in: drops.metadata (JSONB)
 */
export const dropMetadataSchema = z
  .object({
    // Drop specifics
    edition_number: z.number().int().nonnegative().optional().describe("Edition number"),
    edition_total: z.number().int().positive().optional().describe("Total editions"),
    rarity_tier: z.enum(["common", "rare", "epic", "legendary"]).optional(),

    // Availability window
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    duration_hours: z.number().int().positive().optional(),

    // Drop-specific settings
    requires_whitelist: z.boolean().optional().describe("If true, whitelist required"),
    max_per_wallet: z.number().int().positive().optional().describe("Max purchases per wallet"),

    // Engagement
    featured: z.boolean().optional(),
    tags: z.array(z.string()).max(20).optional(),

    // Custom metadata
    custom_fields: z.record(z.any()).optional(),
  })
  .strict()
  .describe("Drop extended metadata");

/**
 * Campaign Metadata Schema
 * Stored in: ip_campaigns.metadata (JSONB)
 */
export const campaignMetadataSchema = z
  .object({
    // Campaign details
    submission_deadline: z.string().datetime().optional(),
    submission_guidelines: z.string().max(2000).optional(),
    reward_type: z.enum(["payment", "poap", "nft", "collaboration"]).optional(),
    reward_value: z.number().nonnegative().optional(),

    // Visibility
    featured: z.boolean().optional(),
    difficulty_level: z.enum(["beginner", "intermediate", "advanced"]).optional(),

    // Engagement tracking
    submission_count: z.number().int().nonnegative().optional(),
    view_count: z.number().int().nonnegative().optional(),

    // Social
    hashtags: z.array(z.string()).max(20).optional(),
    cover_image_uri: ipfsUriSchema.optional().describe("Campaign cover image (IPFS)"),

    // Custom fields
    custom_fields: z.record(z.any()).optional(),
  })
  .strict()
  .describe("Campaign extended metadata");

/**
 * Order/Entitlement Metadata Schema
 * Stored in: orders.metadata, entitlements.metadata (JSONB)
 */
export const entitlementMetadataSchema = z
  .object({
    // Token details (for NFT entitlements)
    token_id: z.string().optional(),
    token_standard: z.enum(["ERC721", "ERC1155", "ERC20"]).optional(),
    contract_address: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/i)
      .optional(),

    // Delivery method
    delivery_method: z
      .enum(["digital", "physical", "email", "download", "wallet"])
      .optional(),
    delivery_url: z.string().url().optional(),
    download_expires_at: z.string().datetime().optional(),

    // Licensing info
    license_granted: z.boolean().optional(),
    license_expires_at: z.string().datetime().optional(),

    // Custom data
    custom_fields: z.record(z.any()).optional(),
  })
  .strict()
  .describe("Entitlement metadata");

/**
 * Upload Transaction Metadata
 * Tracks upload status for error recovery
 * Stored in: separate tracking table or cache
 */
export const uploadTransactionSchema = z.object({
  transaction_id: z.string().uuid().describe("Unique upload transaction ID"),
  file_hash: z.string().describe("Hash of file for integrity checking"),
  file_size_bytes: z.number().int().positive(),
  mime_type: z.string().describe("File MIME type"),
  pinata_cid: z.string().optional().describe("CID if upload succeeded"),
  status: z
    .enum(["pending", "uploading", "verifying", "completed", "failed", "rollback"])
    .default("pending"),
  attempt_count: z.number().int().nonnegative().default(0),
  last_error: z.string().optional(),
  created_at_unix: z.number(),
  expires_at_unix: z.number().describe("Transaction expires after 24 hours"),
  metadata: z.record(z.any()).optional(),
});

/**
 * Utility: Validate metadata against schema
 * Returns: { valid: boolean, error?: string, data?: object }
 */
export function validateMetadata(metadata, schema) {
  try {
    const validated = schema.parse(metadata);
    return { valid: true, data: validated };
  } catch (error) {
    return {
      valid: false,
      error: error.message || "Metadata validation failed",
      details: error.errors || [],
    };
  }
}

/**
 * Utility: Normalize IPFS URI to standard format
 * Converts: bare CID, ipfs://ipfs/, http:// gateway URLs → ipfs://bafy...
 */
export function normalizeIpfsUri(uri) {
  if (!uri) return null;

  const trimmed = String(uri).trim();

  // Already in correct format
  if (trimmed.match(/^ipfs:\/\/(bafy[a-z2-7]+|bafk[a-z2-7]+|Qm[1-9A-HJ-NP-Za-km-z]{44,})$/i)) {
    return trimmed;
  }

  // Gateway URL format: https://gateway.pinata.cloud/ipfs/bafy...
  const gatewayMatch = trimmed.match(/^https?:\/\/[^\/]+\/ipfs\/(.+)$/i);
  if (gatewayMatch) {
    return `ipfs://${gatewayMatch[1]}`;
  }

  // Double-prefixed format: ipfs://ipfs/bafy...
  if (trimmed.startsWith("ipfs://ipfs/")) {
    return `ipfs://${trimmed.slice("ipfs://ipfs/".length)}`;
  }

  // Bare CID: bafy... or Qm...
  if (trimmed.match(/^(bafy[a-z2-7]+|bafk[a-z2-7]+|Qm[1-9A-HJ-NP-Za-km-z]{44,})$/i)) {
    return `ipfs://${trimmed}`;
  }

  return null; // Invalid format
}

/**
 * Utility: Extract CID from any IPFS format
 */
export function extractCid(ipfsUri) {
  if (!ipfsUri) return null;

  const normalized = normalizeIpfsUri(ipfsUri);
  if (!normalized) return null;

  return normalized.replace(/^ipfs:\/\//, "");
}

/**
 * Export all validation functions for use in API endpoints
 */
export const metadataValidators = {
  portfolio: (data) => validateMetadata(data, portfolioSchema),
  product: (data) => validateMetadata(data, productMetadataSchema),
  drop: (data) => validateMetadata(data, dropMetadataSchema),
  campaign: (data) => validateMetadata(data, campaignMetadataSchema),
  entitlement: (data) => validateMetadata(data, entitlementMetadataSchema),
  uploadTransaction: (data) => validateMetadata(data, uploadTransactionSchema),
};
