/**
 * Gift Routes - NFT gifting endpoints
 * Location: server/routes/gifts.js
 * Handles gift creation, claiming, and management
 */

import express from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { errorHandler, requireAuth } from '../middleware/errors.js';
import {
  createGift,
  claimGift,
} from '../api/contracts.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * Validation schemas
 */
const createGiftSchema = z.object({
  productId: z.number().positive(),
  recipientEmail: z.string().email(),
  message: z.string().max(500).optional(),
  quantity: z.number().int().positive().default(1),
});

const claimGiftSchema = z.object({
  giftId: z.string().uuid(),
  claimToken: z.string(),
});

/**
 * POST /api/gifts
 * Create a gift NFT for a recipient
 */
router.post(
  '/',
  requireAuth,
  errorHandler(async (req, res) => {
    const validation = createGiftSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { productId, recipientEmail, message, quantity } = validation.data;
    const senderAddress = req.user.address;

    // Verify product exists
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create gift on blockchain
    const { txHash, giftTokenId } = await createGift({
      productId,
      recipientEmail,
      senderAddress,
      message,
      quantity,
    });

    // Store gift in database
    const { data: gift, error } = await supabase
      .from('gifts')
      .insert([
        {
          product_id: productId,
          sender_address: senderAddress,
          recipient_email: recipientEmail,
          message,
          quantity,
          tx_hash: txHash,
          token_id: giftTokenId,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Send claim email to recipient (fire and forget)
    fetch('/api/internal/email/send-gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail,
        giftId: gift.id,
        senderName: req.user.displayName || 'A creator',
        productName: product.name,
        message,
        claimUrl: `${process.env.FRONTEND_URL}/gifts/claim/${gift.id}`,
      }),
    }).catch((err) => console.error('Email send failed:', err));

    res.json({
      success: true,
      gift: {
        id: gift.id,
        tokenId: giftTokenId,
        txHash,
        status: 'pending',
        createdAt: gift.created_at,
      },
    });
  })
);

/**
 * GET /api/gifts/pending
 * Get all pending gifts for authenticated user
 */
router.get(
  '/pending',
  requireAuth,
  errorHandler(async (req, res) => {
    const userEmail = req.user.email;

    const { data: gifts, error } = await supabase
      .from('gifts')
      .select('*, products(*)')
      .eq('recipient_email', userEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      gifts: gifts || [],
      count: (gifts || []).length,
    });
  })
);

/**
 * GET /api/gifts/sent
 * Get all gifts sent by authenticated creator
 */
router.get(
  '/sent',
  requireAuth,
  errorHandler(async (req, res) => {
    const creatorAddress = req.user.address;

    const { data: gifts, error } = await supabase
      .from('gifts')
      .select('*, products(*)')
      .eq('sender_address', creatorAddress)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      gifts: gifts || [],
      count: (gifts || []).length,
    });
  })
);

/**
 * POST /api/gifts/:giftId/claim
 * Claim a gift NFT
 */
router.post(
  '/:giftId/claim',
  errorHandler(async (req, res) => {
    const validation = claimGiftSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { giftId, claimToken } = validation.data;
    const userAddress = req.user?.address;

    if (!userAddress) {
      return res.status(401).json({ error: 'Must connect wallet to claim' });
    }

    // Get gift from database
    const { data: gift, error: getError } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', giftId)
      .single();

    if (getError) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    if (gift.status === 'claimed') {
      return res.status(400).json({ error: 'Gift already claimed' });
    }

    // Validate claim token
    const isValidToken = gift.token_id === claimToken;
    if (!isValidToken) {
      return res.status(403).json({ error: 'Invalid claim token' });
    }

    // Process claim on blockchain
    const { txHash } = await claimGift({
      giftId: gift.token_id,
      claimerAddress: userAddress,
    });

    // Update gift status in database
    const { data: updated, error: updateError } = await supabase
      .from('gifts')
      .update({
        status: 'claimed',
        claimed_by: userAddress,
        claimed_at: new Date().toISOString(),
        claim_tx_hash: txHash,
      })
      .eq('id', giftId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      gift: {
        id: updated.id,
        status: 'claimed',
        claimedAt: updated.claimed_at,
        claimTxHash: txHash,
      },
    });
  })
);

/**
 * GET /api/gifts/:giftId/claim-details
 * Get gift details for claiming (public endpoint)
 */
router.get(
  '/:giftId/claim-details',
  errorHandler(async (req, res) => {
    const { giftId } = req.params;

    const { data: gift, error } = await supabase
      .from('gifts')
      .select('*, products(name, description, image)')
      .eq('id', giftId)
      .single();

    if (error || !gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    // Don't expose sensitive info
    const safeGift = {
      id: gift.id,
      productName: gift.products.name,
      productDescription: gift.products.description,
      productImage: gift.products.image,
      message: gift.message,
      senderDisplayName: gift.sender_display_name || 'A creator',
      status: gift.status,
    };

    res.json({ success: true, gift: safeGift });
  })
);

/**
 * GET /api/gifts/:giftId
 * Get full gift details (authenticated only)
 */
router.get(
  '/:giftId',
  requireAuth,
  errorHandler(async (req, res) => {
    const { giftId } = req.params;
    const userAddress = req.user.address;
    const userEmail = req.user.email;

    const { data: gift, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', giftId)
      .single();

    if (error || !gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    // Check authorization
    const isRecipient = gift.recipient_email === userEmail;
    const isSender = gift.sender_address === userAddress;

    if (!isRecipient && !isSender) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ success: true, gift });
  })
);

/**
 * DELETE /api/gifts/:giftId
 * Delete a pending gift (sender only)
 */
router.delete(
  '/:giftId',
  requireAuth,
  errorHandler(async (req, res) => {
    const { giftId } = req.params;
    const senderAddress = req.user.address;

    const { data: gift } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', giftId)
      .single();

    if (!gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    if (gift.sender_address !== senderAddress) {
      return res.status(403).json({ error: 'Only sender can delete gift' });
    }

    if (gift.status === 'claimed') {
      return res.status(400).json({ error: 'Cannot delete claimed gift' });
    }

    const { error } = await supabase
      .from('gifts')
      .delete()
      .eq('id', giftId);

    if (error) throw error;

    res.json({ success: true, message: 'Gift deleted' });
  })
);


export default router;
