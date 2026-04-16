/**
 * Product Management Routes
 * Location: server/routes/products.js
 * 
 * Handles product creation, purchases, and auction management
 */

import express from "express";
import { z } from "zod";
import { supabase } from "../db/index.js";
import {
  createProduct,
  purchaseProduct,
  estimatePurchaseGas,
  createAuction,
  placeBid,
  getAuctionDetails,
} from "../api/contracts.js";
import { requireAuth } from "../middleware/auth.js";
import { errorHandler } from "../middleware/errors.js";

const router = express.Router();

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═════════════════════════════════════════════════════════════════════════════

const CreateProductSchema = z.object({
  name: z.string().min(3, "Product name min 3 chars"),
  description: z.string().min(10, "Description min 10 chars"),
  supply: z.number().int().min(1, "Supply min 1"),
  priceEth: z.string().regex(/^\d+(\.\d+)?$/, "Valid ETH amount required"),
  royaltyBps: z.number().int().min(0).max(10000, "Royalty max 10000 bps"),
  metadataUri: z.string().url("Valid URL required"),
  category: z.enum([
    "art",
    "music",
    "video",
    "collectible",
    "other",
  ]),
});

const PurchaseProductSchema = z.object({
  quantity: z.number().int().min(1, "Quantity min 1"),
  paymentMethod: z.enum(["eth", "usdc", "usdt"]),
});

const CreateAuctionSchema = z.object({
  productId: z.number().int().min(1),
  startPriceEth: z.string().regex(/^\d+(\.\d+)?$/),
  durationSeconds: z.number().int().min(600, "Duration min 10 min"),
  minBidIncrementEth: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional(),
});

const PlaceBidSchema = z.object({
  bidAmountEth: z.string().regex(/^\d+(\.\d+)?$/),
});

// ═════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/products
 * Create a new product
 */
router.post("/", requireAuth, errorHandler(async (req, res) => {
  const validation = CreateProductSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { name, description, supply, priceEth, royaltyBps, metadataUri, category } =
    validation.data;
  const creatorId = req.user.id;

  try {
    console.log(`📝 Creating product for creator ${creatorId}`);

    // Create product on blockchain
    const blockchainResult = await createProduct({
      name,
      description,
      supply,
      priceEth,
      royaltyBps,
      metadataUri,
    });

    // Save product metadata to database
    const { data: product, error: dbError } = await supabase
      .from("products")
      .insert({
        product_id: blockchainResult.productId,
        creator_id: creatorId,
        name,
        description,
        category,
        supply,
        price_eth: parseFloat(priceEth),
        royalty_bps: royaltyBps,
        metadata_uri: metadataUri,
        transaction_hash: blockchainResult.transactionHash,
        status: "active",
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ Database error:", dbError);
      return res
        .status(500)
        .json({ error: "Failed to save product to database" });
    }

    console.log(`✅ Product created: ${product.id}`);
    res.status(201).json({
      success: true,
      product,
      transactionHash: blockchainResult.transactionHash,
    });
  } catch (error) {
    console.error("❌ Error creating product:", error);
    throw error;
  }
}));

/**
 * GET /api/products/:id/purchase-estimate
 * Estimate gas cost for purchase
 */
router.get("/:id/purchase-estimate", errorHandler(async (req, res) => {
  const { id: productId } = req.params;
  const { quantity = 1 } = req.query;

  try {
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", productId)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Estimate gas
    const gasEstimate = await estimatePurchaseGas(
      productId,
      parseInt(quantity)
    );

    const totalCostEth = (
      parseFloat(product.price_eth) * parseInt(quantity) +
      parseFloat(gasEstimate.estimatedCostEth)
    ).toString();

    res.json({
      productPrice: product.price_eth,
      quantity: parseInt(quantity),
      subtotal: (product.price_eth * parseInt(quantity)).toString(),
      ...gasEstimate,
      totalCostEth,
    });
  } catch (error) {
    console.error("❌ Error estimating purchase:", error);
    throw error;
  }
}));

/**
 * POST /api/products/:id/purchase
 * Execute product purchase
 */
router.post("/:id/purchase", requireAuth, errorHandler(async (req, res) => {
  const { id: productId } = req.params;
  const validation = PurchaseProductSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { quantity, paymentMethod } = validation.data;
  const buyerId = req.user.id;

  try {
    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check available supply
    const { data: sales } = await supabase
      .from("purchases")
      .select("quantity")
      .eq("product_id", productId);

    const sold = sales.reduce((sum, s) => sum + s.quantity, 0);
    if (sold + quantity > product.supply) {
      return res.status(400).json({ error: "Insufficient supply" });
    }

    console.log(
      `💰 Processing purchase: product ${productId}, quantity ${quantity}`
    );

    // Execute purchase on blockchain
    const blockchainResult = await purchaseProduct(
      productId,
      quantity,
      req.user.wallet_address
    );

    // Save purchase to database
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        quantity,
        price_eth: product.price_eth * quantity,
        payment_method: paymentMethod,
        token_ids: blockchainResult.tokenIds,
        transaction_hash: blockchainResult.transactionHash,
        status: "completed",
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("❌ Database error:", purchaseError);
      return res
        .status(500)
        .json({ error: "Failed to save purchase to database" });
    }

    // Update seller earnings
    const { error: earningsError } = await supabase
      .from("creator_earnings")
      .upsert(
        {
          creator_id: product.creator_id,
          pending_eth: product.price_eth * quantity,
          total_earned_eth: product.price_eth * quantity,
        },
        { onConflict: "creator_id" }
      );

    if (earningsError) console.warn("⚠️  Earnings update failed:", earningsError);

    console.log(`✅ Purchase completed: ${purchase.id}`);
    res.status(201).json({
      success: true,
      purchase,
      transactionHash: blockchainResult.transactionHash,
    });
  } catch (error) {
    console.error("❌ Error processing purchase:", error);
    throw error;
  }
}));

/**
 * GET /api/products/:id
 * Get product details
 */
router.get("/:id", errorHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get creator info
    const { data: creator } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", product.creator_id)
      .single();

    res.json({ product, creator });
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    throw error;
  }
}));

/**
 * GET /api/products
 * List all products with optional filtering
 */
router.get("/", errorHandler(async (req, res) => {
  const { category, creator_id, limit = 20, offset = 0 } = req.query;

  try {
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);
    if (creator_id) query = query.eq("creator_id", creator_id);

    const { data: products, count, error } = await query.range(
      parseInt(offset),
      parseInt(offset) + parseInt(limit) - 1
    );

    if (error) throw error;

    res.json({
      products,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    throw error;
  }
}));

/**
 * POST /api/products/:id/auctions
 * Create an auction for a product
 */
router.post("/:id/auctions", requireAuth, errorHandler(async (req, res) => {
  const { id: productId } = req.params;
  const validation = CreateAuctionSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { startPriceEth, durationSeconds, minBidIncrementEth = "0.01" } =
    validation.data;

  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.creator_id !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    console.log(`🔨 Creating auction for product ${productId}`);

    const blockchainResult = await createAuction({
      productId,
      startPriceEth,
      durationSeconds,
      minBidIncrementEth,
    });

    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .insert({
        auction_id: blockchainResult.auctionId,
        product_id: productId,
        seller_id: req.user.id,
        start_price_eth: parseFloat(startPriceEth),
        min_bid_increment_eth: parseFloat(minBidIncrementEth),
        duration_seconds: durationSeconds,
        end_time: new Date(
          Date.now() + durationSeconds * 1000
        ).toISOString(),
        transaction_hash: blockchainResult.transactionHash,
        status: "active",
      })
      .select()
      .single();

    if (auctionError) {
      console.error("❌ Database error:", auctionError);
      return res
        .status(500)
        .json({ error: "Failed to save auction to database" });
    }

    console.log(`✅ Auction created: ${auction.id}`);
    res.status(201).json({
      success: true,
      auction,
      transactionHash: blockchainResult.transactionHash,
    });
  } catch (error) {
    console.error("❌ Error creating auction:", error);
    throw error;
  }
}));

/**
 * POST /api/auctions/:id/bids
 * Place a bid on an auction
 */
router.post("/auctions/:id/bids", requireAuth, errorHandler(async (req, res) => {
  const { id: auctionId } = req.params;
  const validation = PlaceBidSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  const { bidAmountEth } = validation.data;
  const bidderId = req.user.id;

  try {
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("*")
      .eq("auction_id", auctionId)
      .single();

    if (auctionError || !auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    const bidAmount = parseFloat(bidAmountEth);
    if (
      bidAmount <
      auction.start_price_eth + auction.min_bid_increment_eth
    ) {
      return res.status(400).json({
        error: "Bid must be at least minimum increment above start price",
      });
    }

    if (new Date() > new Date(auction.end_time)) {
      return res.status(400).json({ error: "Auction has ended" });
    }

    console.log(
      `💰 Placing bid on auction ${auctionId}, amount: ${bidAmountEth} ETH`
    );

    const blockchainResult = await placeBid(auctionId, bidAmountEth);

    const timeRemaining = new Date(auction.end_time) - new Date();
    const shouldExtend = timeRemaining < 10 * 60 * 1000;

    let newEndTime = auction.end_time;
    if (shouldExtend) {
      newEndTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    }

    const { data: bid, error: bidError } = await supabase
      .from("bids")
      .insert({
        auction_id: auctionId,
        bidder_id: bidderId,
        amount_eth: bidAmount,
        transaction_hash: blockchainResult.transactionHash,
      })
      .select()
      .single();

    if (bidError) {
      console.error("❌ Database error:", bidError);
      return res.status(500).json({ error: "Failed to save bid to database" });
    }

    if (shouldExtend) {
      await supabase
        .from("auctions")
        .update({ end_time: newEndTime })
        .eq("auction_id", auctionId);
    }

    console.log(`✅ Bid placed: ${bid.id}`);
    res.status(201).json({
      success: true,
      bid,
      auctionExtended: shouldExtend,
      newEndTime: shouldExtend ? newEndTime : undefined,
      transactionHash: blockchainResult.transactionHash,
    });
  } catch (error) {
    console.error("❌ Error placing bid:", error);
    throw error;
  }
}));

/**
 * GET /api/auctions/:id
 * Get auction details and bid history
 */
router.get("/auctions/:id", errorHandler(async (req, res) => {
  const { id: auctionId } = req.params;

  try {
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .select("*")
      .eq("auction_id", auctionId)
      .single();

    if (auctionError || !auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    const blockchainDetails = await getAuctionDetails(auctionId);

    const { data: bids, error: bidsError } = await supabase
      .from("bids")
      .select("*, bidder:profiles(name, avatar_url)")
      .eq("auction_id", auctionId)
      .order("amount_eth", { ascending: false });

    if (bidsError) console.warn("⚠️  Bids query failed:", bidsError);

    res.json({
      auction,
      blockchainState: blockchainDetails.state,
      bids: bids || [],
    });
  } catch (error) {
    console.error("❌ Error fetching auction:", error);
    throw error;
  }
}));

/**
 * GET /api/auctions/:id/bid-history
 * Get complete bid history for an auction
 */
router.get("/auctions/:id/bid-history", errorHandler(async (req, res) => {
  const { id: auctionId } = req.params;

  try {
    const { data: bids, error } = await supabase
      .from("bids")
      .select("*, bidder:profiles(id, name, avatar_url)")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({ bids });
  } catch (error) {
    console.error("❌ Error fetching bid history:", error);
    throw error;
  }
}));

export default router;
