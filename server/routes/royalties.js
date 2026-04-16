/**
 * Royalties Routes - Secondary market royalty tracking and claims
 * Location: server/routes/royalties.js
 * Handles royalty configuration, tracking, and payouts
 */

import express from 'express';
import { z } from 'zod';
import { errorHandler, requireAuth } from '../middleware/errors.js';
import { claimRoyalties, recordRoyaltyPayment } from '../api/contracts.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * Validation schemas
 */
const recordSaleSchema = z.object({
  tokenId: z.string(),
  salePrice: z.string(),
  seller: z.string(),
  marketplace: z.enum(['OPENSEA', 'BLUR', 'INTERNAL']),
});

/**
 * GET /api/royalties/balance
 * Get creator's royalty balance and pending amounts
 */
router.get(
  '/balance',
  requireAuth,
  errorHandler(async (req, res) => {
    const creatorAddress = req.user.address;

    const { data: pendingSales, error } = await supabase
      .from('royalty_sales')
      .select('*')
      .eq('creator_address', creatorAddress)
      .eq('status', 'pending')
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    // Calculate total pending
    const totalPending = (pendingSales || []).reduce((sum, sale) => {
      return sum + parseFloat(sale.royalty_amount || 0);
    }, 0);

    res.json({
      success: true,
      balance: {
        pendingAmount: totalPending.toString(),
        pendingCount: (pendingSales || []).length,
      },
      recentSales: pendingSales?.slice(0, 10) || [],
    });
  })
);

/**
 * POST /api/royalties/record
 * Record a secondary market sale for royalty tracking
 * Called by marketplace integrations
 */
router.post(
  '/record',
  errorHandler(async (req, res) => {
    const validation = recordSaleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { tokenId, salePrice, seller, marketplace } = validation.data;

    // Get token owner
    const { data: token } = await supabase
      .from('products')
      .select('creator_address')
      .eq('id', tokenId)
      .single();

    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const royaltyAmount = (parseFloat(salePrice) * 0.10).toString(); // 10% default

    // Record in database
    const { error: dbError } = await supabase
      .from('royalty_sales')
      .insert([
        {
          token_id: tokenId,
          creator_address: token.creator_address,
          sale_price: salePrice,
          royalty_amount: royaltyAmount,
          seller_address: seller,
          marketplace,
          recorded_at: new Date().toISOString(),
          status: 'pending',
        },
      ]);

    if (dbError) throw dbError;

    res.json({
      success: true,
      royalty: {
        amount: royaltyAmount,
        percentage: '10.00',
      },
      message: 'Sale recorded',
    });
  })
);

/**
 * POST /api/royalties/claim
 * Creator claims pending royalties
 */
router.post(
  '/claim',
  requireAuth,
  errorHandler(async (req, res) => {
    const { tokenAddress } = req.body;
    const creatorAddress = req.user.address;

    // Get pending sales
    const { data: pendingSales, error } = await supabase
      .from('royalty_sales')
      .select('*')
      .eq('creator_address', creatorAddress)
      .eq('status', 'pending');

    if (error) throw error;

    if (!pendingSales || pendingSales.length === 0) {
      return res.status(400).json({
        error: 'No pending royalties',
        message: 'All royalties have already been claimed',
      });
    }

    // Calculate total claim
    const totalClaim = pendingSales.reduce((sum, sale) => {
      return sum + parseFloat(sale.royalty_amount || 0);
    }, 0);

    if (totalClaim === 0) {
      return res.status(400).json({
        error: 'No amount to claim',
        totalClaim: '0',
      });
    }

    // Record claim on blockchain
    const { txHash } = await claimRoyalties(tokenAddress);

    // Mark sales as claimed
    const { error: updateError } = await supabase
      .from('royalty_sales')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        claim_tx_hash: txHash,
      })
      .eq('creator_address', creatorAddress)
      .eq('status', 'pending');

    if (updateError) throw updateError;

    // Record claim in history
    await supabase.from('royalty_claims').insert([
      {
        creator_address: creatorAddress,
        amount: totalClaim.toString(),
        tx_hash: txHash,
        claimed_at: new Date().toISOString(),
        sale_count: pendingSales.length,
      },
    ]);

    res.json({
      success: true,
      claim: {
        amount: totalClaim.toString(),
        tokenCount: pendingSales.length,
      },
      txHash,
      message: `Claimed ${totalClaim.toFixed(4)} ETH in royalties!`,
    });
  })
);

/**
 * GET /api/royalties/history
 * Get royalty transaction history for creator
 */
router.get(
  '/history',
  requireAuth,
  errorHandler(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const creatorAddress = req.user.address;

    const { data: claims, count, error } = await supabase
      .from('royalty_claims')
      .select('*', { count: 'exact' })
      .eq('creator_address', creatorAddress)
      .order('claimed_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      claims: claims || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  })
);

/**
 * GET /api/royalties/stats
 * Get royalty statistics and analytics for creator
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Get all creator tokens
    const { data: tokens } = await supabase
      .from('tokens')
      .select('token_id')
      .eq('creator_id', req.user.id);

    const tokenIds = tokens?.map(t => t.token_id) || [];

    // Get total earned
    const { data: allSales } = await supabase
      .from('royalty_sales')
      .select('royalty_amount')
      .in('token_id', tokenIds);

    const totalEarned = allSales?.reduce((sum, sale) => {
      return sum + BigInt(sale.royalty_amount || 0);
    }, BigInt(0)) || BigInt(0);

    // Get claimed amount
    const { data: claims } = await supabase
      .from('royalty_claims')
      .select('amount')
      .eq('creator_id', req.user.id);

    const totalClaimed = claims?.reduce((sum, claim) => {
      return sum + BigInt(claim.amount || 0);
    }, BigInt(0)) || BigInt(0);

    const pending = totalEarned - totalClaimed;

    // Get sales count by marketplace
    const { data: salesByMarketplace } = await supabase
      .from('royalty_sales')
      .select('marketplace')
      .in('token_id', tokenIds);

    const marketplaceStats = {};
    salesByMarketplace?.forEach(sale => {
      marketplaceStats[sale.marketplace] = (marketplaceStats[sale.marketplace] || 0) + 1;
    });

    return res.json({
      stats: {
        totalEarned: {
          amount: totalEarned.toString(),
          amountEth: ethers.utils.formatEther(totalEarned.toString()),
        },
        totalClaimed: {
          amount: totalClaimed.toString(),
          amountEth: ethers.utils.formatEther(totalClaimed.toString()),
        },
        pendingClaim: {
          amount: pending.toString(),
          amountEth: ethers.utils.formatEther(pending.toString()),
        },
        totalSales: allSales?.length || 0,
        tokensWithRoyalties: tokenIds.length,
        marketplaces: marketplaceStats,
      },
    });
  } catch (error) {

/**
 * GET /api/royalties/stats
 * Get royalty statistics and analytics for creator
 */
router.get(
  '/stats',
  requireAuth,
  errorHandler(async (req, res) => {
    const creatorAddress = req.user.address;

    // Get all pending royalties
    const { data: pendingSales = [], error: pendingError } = await supabase
      .from('royalty_sales')
      .select('*')
      .eq('creator_address', creatorAddress)
      .eq('status', 'pending');

    if (pendingError) throw pendingError;

    // Get all claimed royalties
    const { data: claims = [] } = await supabase
      .from('royalty_claims')
      .select('*')
      .eq('creator_address', creatorAddress);

    const totalPending = pendingSales.reduce((sum, sale) => {
      return sum + parseFloat(sale.royalty_amount || 0);
    }, 0);

    const totalClaimed = claims.reduce((sum, claim) => {
      return sum + parseFloat(claim.amount || 0);
    }, 0);

    res.json({
      success: true,
      stats: {
        totalPending: totalPending.toString(),
        totalClaimed: totalClaimed.toString(),
        pendingCount: pendingSales.length,
        claimedCount: claims.length,
      },
    });
  })
);

export default router;
