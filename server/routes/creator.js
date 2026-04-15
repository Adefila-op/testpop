/**
 * Creator Routes - Creator dashboard and payout endpoints
 * Handles earnings tracking, payout settings, and claims
 */

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const ethers = require('ethers');
const supabase = require('../integrations/supabase');
const { contracts, waitForTransaction } = require('../api/web3-contracts');
const { requireAuth } = require('../middleware/auth');

// Validation schemas
const setPayoutMethodSchema = z.object({
  method: z.enum(['ETH', 'USDC', 'USDT', 'ESCROW']),
  payoutAddress: z.string().optional(),
});

/**
 * GET /api/creator/earnings
 * Get creator's total and pending earnings
 */
router.get('/earnings', requireAuth, async (req, res) => {
  try {
    // Get pending escrow amount from contract
    let pendingAmount = '0';
    try {
      pendingAmount = await contracts.payoutDistributor.getCreatorEscrow(req.user.wallet);
    } catch (error) {
      console.warn('Could not fetch escrow balance:', error.message);
    }

    // Get all payouts from Supabase
    const { data: payoutRecords } = await supabase
      .from('payout_records')
      .select('*')
      .eq('creator_id', req.user.id)
      .order('created_at', { ascending: false });

    // Calculate totals
    const totalPayouts = payoutRecords?.reduce((sum, record) => {
      return sum + BigInt(record.amount || 0);
    }, BigInt(0)) || BigInt(0);

    // Get creator payout settings
    const { data: payoutSettings } = await supabase
      .from('creator_payout_settings')
      .select('*')
      .eq('creator_id', req.user.id)
      .single();

    // Get last payment date
    const lastPayout = payoutRecords?.[0];

    return res.json({
      earnings: {
        pending: {
          amount: pendingAmount.toString ? pendingAmount.toString() : pendingAmount,
          amountEth: ethers.utils.formatEther(
            ethers.BigNumber.from(pendingAmount.toString ? pendingAmount.toString() : pendingAmount)
          ),
        },
        totalEarned: {
          amount: totalPayouts.toString(),
          amountEth: ethers.utils.formatEther(totalPayouts.toString()),
        },
        lastPayout: lastPayout ? {
          amount: lastPayout.amount,
          date: lastPayout.completed_at,
          method: lastPayout.payout_method,
        } : null,
      },
      settings: payoutSettings || {
        method: 'ESCROW',
        payoutAddress: null,
        bankingVerified: false,
      },
    });
  } catch (error) {
    console.error('Earnings fetch error:', error);
    return res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/creator/payout-method
 * Set creator's payout method and address
 */
router.post('/payout-method', requireAuth, async (req, res) => {
  try {
    const validation = setPayoutMethodSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { method, payoutAddress } = validation.data;

    // Validate payout address if provided
    if (payoutAddress && !ethers.utils.isAddress(payoutAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Update on smart contract
    const payoutMethodMap = { ETH: 0, USDC: 1, USDT: 2, ESCROW: 3 };
    const methodEnum = payoutMethodMap[method];

    const tx = await contracts.payoutDistributorAdmin.setPayoutMethod(
      methodEnum,
      payoutAddress || ethers.constants.AddressZero
    );

    const receipt = await waitForTransaction(tx);

    // Store in Supabase
    const { data, error: dbError } = await supabase
      .from('creator_payout_settings')
      .upsert(
        {
          creator_id: req.user.id,
          creator_wallet: req.user.wallet,
          payout_method: method,
          payout_address: payoutAddress || null,
          updated_at: new Date(),
        },
        { onConflict: 'creator_id' }
      );

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return res.json({
      success: true,
      settings: {
        method,
        payoutAddress: payoutAddress || req.user.wallet,
      },
      transactionHash: receipt.transactionHash,
      message: `Payout method set to ${method}`,
    });
  } catch (error) {
    console.error('Payout method error:', error);
    return res.status(500).json({
      error: 'Settings update failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/creator/payouts/claim
 * Creator claims pending payouts
 */
router.post('/payouts/claim', requireAuth, async (req, res) => {
  try {
    const { method } = req.body;

    if (!method || !['ETH', 'USDC', 'USDT'].includes(method)) {
      return res.status(400).json({
        error: 'Invalid payment method',
        allowed: ['ETH', 'USDC', 'USDT'],
      });
    }

    // Get pending amount
    const pendingAmount = await contracts.payoutDistributor.getCreatorEscrow(
      req.user.wallet
    );

    if (pendingAmount.eq(0)) {
      return res.status(400).json({
        error: 'No pending payouts',
        amount: '0',
      });
    }

    // Map payment method to enum (0=ETH, 1=USDC, 2=USDT)
    const paymentTokenMap = { ETH: 0, USDC: 1, USDT: 2 };
    const token = paymentTokenMap[method];

    // Claim from contract
    const tx = await contracts.payoutDistributor.connect(
      new ethers.Wallet(req.user.privateKey, require('../api/web3-contracts').getProvider())
    ).retrieveEscrowPayout(token);

    const receipt = await waitForTransaction(tx, 'EscrowReleased');

    // Record payout
    const { data: record } = await supabase
      .from('payout_records')
      .insert({
        creator_id: req.user.id,
        creator_wallet: req.user.wallet,
        amount: pendingAmount.toString(),
        payout_method: method,
        transaction_hash: receipt.transactionHash,
        completed_at: new Date(),
        status: 'completed',
      });

    // Send confirmation email
    try {
      const { sendEmail } = require('../services/email');
      await sendEmail({
        to: req.user.email,
        subject: 'Your payout has been processed',
        template: 'payout-confirmed',
        data: {
          amount: ethers.utils.formatEther(pendingAmount),
          method,
          hash: receipt.transactionHash,
        },
      });
    } catch (emailError) {
      console.error('Email failed:', emailError);
    }

    return res.json({
      success: true,
      payout: {
        amount: pendingAmount.toString(),
        amountFormatted: ethers.utils.formatEther(pendingAmount),
        method,
        receiver: req.user.wallet,
      },
      transactionHash: receipt.transactionHash,
      message: `${ethers.utils.formatEther(pendingAmount)} ${method} claimed!`,
    });
  } catch (error) {
    console.error('Claim error:', error);
    return res.status(500).json({
      error: 'Payout claim failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/creator/payouts/history
 * Get creator's payout history
 */
router.get('/payouts/history', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const { data: payouts, count } = await supabase
      .from('payout_records')
      .select('*', { count: 'exact' })
      .eq('creator_id', req.user.id)
      .order('completed_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    return res.json({
      payouts: payouts || [],
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
      error: 'History fetch failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/creator/collaborators
 * Get collaborators set up for revenue splits
 */
router.get('/collaborators', requireAuth, async (req, res) => {
  try {
    const collaborators = await contracts.payoutDistributor.getCollaborators(
      req.user.wallet
    );

    // Get shares for each collaborator
    const collaboratorDetails = await Promise.all(
      collaborators.map(async (collab) => {
        const share = await contracts.payoutDistributor.collaboratorShares(
          req.user.wallet,
          collab
        );
        return {
          address: collab,
          shareBps: share.toString(),
          sharePercent: (parseInt(share) / 100).toFixed(2),
        };
      })
    );

    return res.json({
      collaborators: collaboratorDetails,
      totalShares: collaboratorDetails.reduce((sum, c) => sum + parseInt(c.shareBps), 0),
    });
  } catch (error) {
    console.error('Collaborators error:', error);
    return res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/creator/collaborators
 * Add collaborator for revenue split
 */
router.post('/collaborators', requireAuth, async (req, res) => {
  try {
    const { collaborator, shareBps } = req.body;

    // Validate inputs
    if (!ethers.utils.isAddress(collaborator)) {
      return res.status(400).json({ error: 'Invalid collaborator address' });
    }

    if (!Number.isInteger(shareBps) || shareBps <= 0 || shareBps > 10000) {
      return res.status(400).json({
        error: 'Share must be between 1 and 10000 basis points',
      });
    }

    // Add collaborator on contract
    const tx = await contracts.payoutDistributorAdmin.addCollaborator(
      collaborator,
      shareBps
    );

    const receipt = await waitForTransaction(tx, 'CollaboratorAdded');

    return res.json({
      success: true,
      collaborator: {
        address: collaborator,
        shareBps,
        sharePercent: (shareBps / 100).toFixed(2),
      },
      transactionHash: receipt.transactionHash,
    });
  } catch (error) {
    console.error('Add collaborator error:', error);
    return res.status(500).json({
      error: 'Add collaborator failed',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/creator/collaborators/:address
 * Remove collaborator
 */
router.delete('/collaborators/:address', requireAuth, async (req, res) => {
  try {
    const { address } = req.params;

    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    // Remove on contract
    const tx = await contracts.payoutDistributorAdmin.removeCollaborator(address);
    const receipt = await waitForTransaction(tx, 'CollaboratorRemoved');

    return res.json({
      success: true,
      removed: address,
      transactionHash: receipt.transactionHash,
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    return res.status(500).json({
      error: 'Remove collaborator failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/creator/dashboard
 * Complete creator dashboard overview
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Get earnings
    const earningsResponse = await new Promise((resolve) => {
      router.get.call(
        { user: req.user, query: {} },
        '/earnings',
        (data) => resolve(data)
      );
    }).catch(() => ({
      earnings: {
        pending: { amount: '0' },
        totalEarned: { amount: '0' },
      },
    }));

    // Get products created
    const { data: products } = await supabase
      .from('products')
      .select('id, name, status')
      .eq('creator_id', req.user.id);

    // Get recent sales
    const { data: recentSales } = await supabase
      .from('purchases')
      .select('*, product:product_id(name)')
      .eq('product_id', products?.map(p => p.id))
      .order('created_at', { ascending: false })
      .limit(10);

    return res.json({
      creator: {
        name: req.user.name,
        wallet: req.user.wallet,
        avatar: req.user.avatar,
      },
      earnings: earningsResponse.earnings,
      stats: {
        productsCreated: products?.length || 0,
        recentSales: recentSales?.length || 0,
      },
      recentActivity: recentSales || [],
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({
      error: 'Dashboard fetch failed',
      message: error.message,
    });
  }
});

module.exports = router;
