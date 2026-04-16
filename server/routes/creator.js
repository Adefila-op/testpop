/**
 * Creator Routes - Creator dashboard and payout endpoints
 * Location: server/routes/creator.js
 * Handles earnings tracking, payout settings, and claims
 */

import express from 'express';
import { z } from 'zod';
import { formatEther, isAddress } from 'ethers';
import { errorHandler, requireAuth } from '../middleware/errors.js';
import {
  setPayoutMethod,
  claimCreatorPayout,
  getCreatorEarnings,
} from '../api/contracts.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * Validation schemas
 */
const setPayoutMethodSchema = z.object({
  method: z.enum(['bank', 'crypto', 'stripe']),
  payoutAddress: z.string().optional(),
  bankAccount: z.object({
    accountHolder: z.string().optional(),
    iban: z.string().optional(),
  }).optional(),
});

const claimPayoutSchema = z.object({
  method: z.enum(['bank', 'crypto', 'stripe']),
});

/**
 * GET /api/creator/earnings
 * Get creator's total and pending earnings
 */
router.get(
  '/earnings',
  requireAuth,
  errorHandler(async (req, res) => {
    const creatorAddress = req.user.address;

    // Get earnings data from contract and database
    const earnings = await getCreatorEarnings(creatorAddress);

    // Get all payouts from Supabase
    const { data: payoutRecords, error } = await supabase
      .from('payout_records')
      .select('*')
      .eq('creator_address', creatorAddress)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate totals
    const totalPayouts = (payoutRecords || []).reduce((sum, record) => {
      return sum + parseFloat(record.amount || 0);
    }, 0);

    // Get creator payout settings
    const { data: payoutSettings } = await supabase
      .from('creator_payout_settings')
      .select('*')
      .eq('creator_address', creatorAddress)
      .single();

    // Get last payment date
    const lastPayout = payoutRecords?.[0];

    res.json({
      success: true,
      earnings: {
        pending: earnings.pending,
        totalEarned: totalPayouts.toString(),
        lastPayout: lastPayout
          ? {
              amount: lastPayout.amount,
              date: lastPayout.completed_at,
              method: lastPayout.payout_method,
            }
          : null,
      },
      settings: payoutSettings || {
        method: 'crypto',
        payoutAddress: null,
        bankingVerified: false,
      },
    });
  })
);

/**
 * POST /api/creator/payout-method
 * Set creator's payout method and address
 */
router.post(
  '/payout-method',
  requireAuth,
  errorHandler(async (req, res) => {
    const validation = setPayoutMethodSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { method, payoutAddress, bankAccount } = validation.data;
    const creatorAddress = req.user.address;

    // Validate payout address if provided
    if (payoutAddress && !isAddress(payoutAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Update on smart contract
    const { txHash } = await setPayoutMethod(creatorAddress, method, payoutAddress);

    // Store in Supabase
    const { error: dbError } = await supabase
      .from('creator_payout_settings')
      .upsert([
        {
          creator_address: creatorAddress,
          payout_method: method,
          payout_address: payoutAddress || null,
          bank_account: bankAccount || null,
          updated_at: new Date().toISOString(),
        },
      ]);

    if (dbError) throw dbError;

    res.json({
      success: true,
      settings: {
        method,
        payoutAddress: payoutAddress || creatorAddress,
      },
      txHash,
      message: `Payout method set to ${method}`,
    });
  })
);

/**
 * POST /api/creator/payouts/claim
 * Creator claims pending payouts
 */
router.post(
  '/payouts/claim',
  requireAuth,
  errorHandler(async (req, res) => {
    const validation = claimPayoutSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { method } = validation.data;
    const creatorAddress = req.user.address;

    // Get pending amount
    const earnings = await getCreatorEarnings(creatorAddress);
    const pendingAmount = parseFloat(earnings.pending || '0');

    if (pendingAmount === 0) {
      return res.status(400).json({
        error: 'No pending payouts',
        amount: '0',
      });
    }

    // Claim from contract
    const { txHash } = await claimCreatorPayout(method);

    // Record payout
    const { error: dbError } = await supabase
      .from('payout_records')
      .insert([
        {
          creator_address: creatorAddress,
          amount: pendingAmount.toString(),
          payout_method: method,
          tx_hash: txHash,
          completed_at: new Date().toISOString(),
          status: 'pending',
        },
      ]);

    if (dbError) throw dbError;

    // Send confirmation email (fire and forget)
    fetch('/api/internal/email/payout-confirmed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: req.user.email,
        amount: pendingAmount,
        method,
        txHash,
      }),
    }).catch((err) => console.error('Email send failed:', err));

    res.json({
      success: true,
      payout: {
        amount: pendingAmount.toString(),
        method,
        receiver: creatorAddress,
      },
      txHash,
      message: `${pendingAmount.toFixed(4)} ETH claimed via ${method}!`,
    });
  })
);

/**
 * GET /api/creator/payouts/history
 * Get creator's payout history
 */
router.get(
  '/payouts/history',
  requireAuth,
  errorHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const creatorAddress = req.user.address;

    const { data: payouts, count, error } = await supabase
      .from('payout_records')
      .select('*', { count: 'exact' })
      .eq('creator_address', creatorAddress)
      .order('completed_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      payouts: payouts || [],
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
 * GET /api/creator/dashboard
 * Complete creator dashboard overview
 */
router.get(
  '/dashboard',
  requireAuth,
  errorHandler(async (req, res) => {
    const creatorAddress = req.user.address;

    // Get earnings
    const earnings = await getCreatorEarnings(creatorAddress);

    // Get products created
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, status')
      .eq('creator_address', creatorAddress);

    if (prodError) throw prodError;

    // Get recent sales
    const { data: recentSales, error: salesError } = await supabase
      .from('purchases')
      .select('*, products(name)')
      .in('product_id', products?.map((p) => p.id) || [])
      .order('created_at', { ascending: false })
      .limit(10);

    if (salesError) throw salesError;

    // Get total revenue
    const totalRevenue = (recentSales || []).reduce((sum, sale) => {
      return sum + parseFloat(sale.amount || 0);
    }, 0);

    res.json({
      success: true,
      creator: {
        address: creatorAddress,
        name: req.user.name,
        avatar: req.user.avatar,
      },
      earnings,
      stats: {
        productsCreated: products?.length || 0,
        recentSalesCount: recentSales?.length || 0,
        totalRevenue: totalRevenue.toString(),
      },
      recentActivity: recentSales || [],
    });
  })
);

/**
 * GET /api/creator/stats
 * Creator statistics
 */
router.get(
  '/stats',
  requireAuth,
  errorHandler(async (req, res) => {
    const creatorAddress = req.user.address;

    // Products
    const { data: products = [] } = await supabase
      .from('products')
      .select('id')
      .eq('creator_address', creatorAddress);

    // Total sales
    const { data: sales = [], count: totalSales } = await supabase
      .from('purchases')
      .select('*', { count: 'exact' })
      .in('product_id', products.map((p) => p.id));

    // Total auctions
    const { data: auctions = [], count: totalAuctions } = await supabase
      .from('auctions')
      .select('*', { count: 'exact' })
      .eq('creator_address', creatorAddress);

    res.json({
      success: true,
      stats: {
        productsCount: products.length,
        totalSales: totalSales || 0,
        totalAuctions: totalAuctions || 0,
        totalEarnings: (sales || [])
          .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
          .toString(),
      },
    });
  })
);


export default router;
