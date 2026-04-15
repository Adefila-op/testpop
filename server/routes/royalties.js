/**
 * Royalties Routes - Secondary market royalty tracking and claims
 * Handles royalty configuration, tracking, and payouts
 */

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const ethers = require('ethers');
const supabase = require('../integrations/supabase');
const { contracts, waitForTransaction } = require('../api/web3-contracts');
const { requireAuth } = require('../middleware/auth');

// Validation schemas
const royaltyConfigSchema = z.object({
  tokenId: z.string(),
  royaltyBps: z.number().int().min(0).max(10000),
  recipients: z.array(z.object({
    address: z.string(),
    shareBps: z.number().int().min(0).max(10000),
  })),
});

const recordSaleSchema = z.object({
  tokenId: z.string(),
  salePrice: z.string(),
  seller: z.string(),
  marketplace: z.enum(['RARIBLE', 'OPENSEA', 'BLUR', 'INTERNAL']),
});

/**
 * GET /api/royalties/:tokenId
 * Get royalty configuration for a token
 */
router.get('/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Get from contract
    let royaltyInfo;
    try {
      royaltyInfo = await contracts.royaltyManager.royaltyConfigs(tokenId);
    } catch (error) {
      console.warn('Could not fetch from contract:', error.message);
      royaltyInfo = null;
    }

    // Get from database for additional details
    const { data: dbConfig } = await supabase
      .from('royalty_configurations')
      .select('*')
      .eq('token_id', tokenId)
      .single();

    const config = {
      tokenId,
      royaltyPercentage: royaltyInfo?.royaltyBps
        ? (parseInt(royaltyInfo.royaltyBps) / 100).toFixed(2)
        : null,
      royaltyBps: royaltyInfo?.royaltyBps?.toString() || '0',
      recipients: royaltyInfo?.recipients || [],
      created: dbConfig?.created_at,
      totalEarned: dbConfig?.total_earned || '0',
    };

    return res.json(config);
  } catch (error) {
    console.error('Royalty config error:', error);
    return res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/royalties/:tokenId/configure
 * Set royalty configuration for a token (creator only)
 */
router.post('/:tokenId/configure', requireAuth, async (req, res) => {
  try {
    const { tokenId } = req.params;
    const validation = royaltyConfigSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { royaltyBps, recipients } = validation.data;

    // Verify creator is owner
    const { data: token } = await supabase
      .from('tokens')
      .select('creator_id')
      .eq('token_id', tokenId)
      .single();

    if (token?.creator_id !== req.user.id) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only token creator can configure royalties',
      });
    }

    // Validate total shares = 10000 basis points
    const totalShares = recipients.reduce((sum, r) => sum + r.shareBps, 0);
    if (totalShares !== 10000) {
      return res.status(400).json({
        error: 'Invalid shares',
        message: `Total shares must equal 10000 basis points (100%), got ${totalShares}`,
        expected: 10000,
        received: totalShares,
      });
    }

    // Validate addresses
    for (const recipient of recipients) {
      if (!ethers.utils.isAddress(recipient.address)) {
        return res.status(400).json({
          error: 'Invalid address in recipients',
          address: recipient.address,
        });
      }
    }

    // Set on contract
    const recipientAddresses = recipients.map(r => r.address);
    const recipientShares = recipients.map(r => r.shareBps);

    const tx = await contracts.royaltyManagerAdmin.setRoyaltyConfig(
      tokenId,
      royaltyBps,
      recipientAddresses,
      recipientShares
    );

    const receipt = await waitForTransaction(tx, 'RoyaltyConfigured');

    // Store in database
    await supabase.from('royalty_configurations').upsert(
      {
        token_id: tokenId,
        creator_id: req.user.id,
        royalty_bps: royaltyBps,
        recipients: recipients,
        configured_at: new Date(),
      },
      { onConflict: 'token_id' }
    );

    return res.json({
      success: true,
      configuration: {
        tokenId,
        royaltyBps,
        royaltyPercentage: (royaltyBps / 100).toFixed(2),
        recipients,
      },
      transactionHash: receipt.transactionHash,
    });
  } catch (error) {
    console.error('Configure royalty error:', error);
    return res.status(500).json({
      error: 'Configuration failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/royalties/:tokenId/record
 * Record a secondary market sale for royalty tracking
 * Called by marketplace integrations
 */
router.post('/:tokenId/record', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const validation = recordSaleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { salePrice, seller, marketplace } = validation.data;

    // Verify sale price is valid
    if (!ethers.BigNumber.isBigNumber(ethers.BigNumber.from(salePrice))) {
      return res.status(400).json({
        error: 'Invalid sale price',
      });
    }

    // Get royalty config
    const royaltyConfig = await contracts.royaltyManager.royaltyConfigs(tokenId);

    if (!royaltyConfig || royaltyConfig.royaltyBps === 0) {
      // No royalties on this token
      return res.json({
        success: true,
        royaltyDue: '0',
        message: 'Sale recorded, no royalties configured',
      });
    }

    // Calculate royalty amount
    const salePriceBI = ethers.BigNumber.from(salePrice);
    const royaltyAmount = salePriceBI.mul(royaltyConfig.royaltyBps).div(10000);

    // Record in database
    const { data: saleRecord } = await supabase
      .from('royalty_sales')
      .insert({
        token_id: tokenId,
        sale_price: salePrice,
        royalty_amount: royaltyAmount.toString(),
        seller_address: seller,
        marketplace,
        recorded_at: new Date(),
        status: 'pending',
      });

    // Notify royalty recipients
    try {
      await supabase.from('royalty_notifications').insert({
        token_id: tokenId,
        sale_info: {
          price: salePrice,
          royalty: royaltyAmount.toString(),
          marketplace,
        },
        created_at: new Date(),
      });
    } catch (notifyError) {
      console.warn('Notification failed:', notifyError);
    }

    return res.json({
      success: true,
      saleRecord: saleRecord?.[0],
      royalty: {
        amount: royaltyAmount.toString(),
        amountEth: ethers.utils.formatEther(royaltyAmount),
        percentage: (parseInt(royaltyConfig.royaltyBps) / 100).toFixed(2),
      },
      message: 'Sale recorded',
    });
  } catch (error) {
    console.error('Record sale error:', error);
    return res.status(500).json({
      error: 'Failed to record sale',
      message: error.message,
    });
  }
});

/**
 * GET /api/royalties/pending
 * Get pending royalty claims for creator
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    // Get creator's tokens
    const { data: tokens } = await supabase
      .from('tokens')
      .select('token_id')
      .eq('creator_id', req.user.id);

    if (!tokens || tokens.length === 0) {
      return res.json({
        pending: [],
        totalPending: '0',
        message: 'No tokens created',
      });
    }

    const tokenIds = tokens.map(t => t.token_id);

    // Get pending royalties from sales
    const { data: pendingSales } = await supabase
      .from('royalty_sales')
      .select('*, token:token_id(*)')
      .in('token_id', tokenIds)
      .eq('status', 'pending')
      .order('recorded_at', { ascending: false });

    // Calculate totals
    const totalPending = pendingSales?.reduce((sum, sale) => {
      return sum + BigInt(sale.royalty_amount || 0);
    }, BigInt(0)) || BigInt(0);

    return res.json({
      pending: pendingSales || [],
      totalPending: totalPending.toString(),
      totalPendingEth: ethers.utils.formatEther(totalPending.toString()),
      count: pendingSales?.length || 0,
    });
  } catch (error) {
    console.error('Pending error:', error);
    return res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/royalties/claim
 * Creator claims pending royalties
 */
router.post('/claim', requireAuth, async (req, res) => {
  try {
    const { tokenIds } = req.body;

    // Validate input
    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return res.status(400).json({
        error: 'tokenIds must be non-empty array',
      });
    }

    // Get creator's tokens
    const { data: creatorTokens } = await supabase
      .from('tokens')
      .select('token_id')
      .eq('creator_id', req.user.id);

    const creatorTokenIds = creatorTokens?.map(t => t.token_id) || [];

    // Verify creator owns all tokens
    const unauthorized = tokenIds.filter(id => !creatorTokenIds.includes(id));
    if (unauthorized.length > 0) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Some tokens are not owned by creator',
        unauthorized,
      });
    }

    // Get pending sales for these tokens
    const { data: pendingSales } = await supabase
      .from('royalty_sales')
      .select('*')
      .in('token_id', tokenIds)
      .eq('status', 'pending');

    if (!pendingSales || pendingSales.length === 0) {
      return res.status(400).json({
        error: 'No pending royalties',
        message: 'All royalties have already been claimed',
      });
    }

    // Calculate total claim
    const totalClaim = pendingSales.reduce((sum, sale) => {
      return sum + BigInt(sale.royalty_amount || 0);
    }, BigInt(0));

    if (totalClaim === BigInt(0)) {
      return res.status(400).json({
        error: 'No amount to claim',
        totalClaim: '0',
      });
    }

    // Call contract to release royalties
    const tx = await contracts.royaltyManager.connect(
      new ethers.Wallet(req.user.privateKey, require('../api/web3-contracts').getProvider())
    ).releaseRoyalties(tokenIds, totalClaim);

    const receipt = await waitForTransaction(tx, 'RoyaltiesReleased');

    // Mark sales as claimed
    await supabase
      .from('royalty_sales')
      .update({ status: 'claimed', claimed_at: new Date() })
      .in('id', pendingSales.map(s => s.id));

    // Record claim in history
    await supabase.from('royalty_claims').insert({
      creator_id: req.user.id,
      token_ids: tokenIds,
      amount: totalClaim.toString(),
      transaction_hash: receipt.transactionHash,
      claimed_at: new Date(),
    });

    return res.json({
      success: true,
      claim: {
        amount: totalClaim.toString(),
        amountEth: ethers.utils.formatEther(totalClaim.toString()),
        tokenCount: tokenIds.length,
        saleCount: pendingSales.length,
      },
      transactionHash: receipt.transactionHash,
      message: `Claimed ${ethers.utils.formatEther(totalClaim.toString())} ETH in royalties!`,
    });
  } catch (error) {
    console.error('Claim royalty error:', error);
    return res.status(500).json({
      error: 'Claim failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/royalties/history
 * Get royalty transaction history for creator
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Get all royalty claims for creator
    const { data: claims, count } = await supabase
      .from('royalty_claims')
      .select('*', { count: 'exact' })
      .eq('creator_id', req.user.id)
      .order('claimed_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Get all royalty sales for creator's tokens
    const { data: creatorTokens } = await supabase
      .from('tokens')
      .select('token_id')
      .eq('creator_id', req.user.id);

    const tokenIds = creatorTokens?.map(t => t.token_id) || [];

    const { data: sales } = await supabase
      .from('royalty_sales')
      .select('*')
      .in('token_id', tokenIds)
      .eq('status', 'claimed')
      .order('recorded_at', { ascending: false })
      .limit(50);

    return res.json({
      claims: claims || [],
      recentSales: sales || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

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
    console.error('Stats error:', error);
    return res.status(500).json({
      error: 'Stats fetch failed',
      message: error.message,
    });
  }
});

module.exports = router;
