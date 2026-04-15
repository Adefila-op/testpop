/**
 * Gift Routes - NFT gifting endpoints
 * Handles gift creation, claiming, and management
 */

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const crypto = require('crypto');
const ethers = require('ethers');
const supabase = require('../integrations/supabase');
const { contracts, waitForTransaction } = require('../api/web3-contracts');
const { requireAuth } = require('../middleware/auth');
const { sendEmail } = require('../services/email');

// Validation schemas
const createGiftSchema = z.object({
  productId: z.number().positive(),
  recipientEmail: z.string().email(),
  recipientMessage: z.string().max(500).optional(),
});

const claimGiftSchema = z.object({
  giftId: z.string(),
  claimToken: z.string(),
});

/**
 * Helper: Encrypt email for on-chain storage
 */
const encryptEmail = (email) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'default-key');
  let encrypted = cipher.update(email, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

/**
 * Helper: Decrypt email from on-chain storage
 */
const decryptEmail = (encrypted) => {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'default-key');
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Helper: Generate secure claim token
 */
const generateClaimToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * POST /api/gifts/create
 * Create gift for recipient
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const validation = createGiftSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { productId, recipientEmail, recipientMessage } = validation.data;

    // Get product details
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Encrypt recipient email
    const encryptedEmail = encryptEmail(recipientEmail);
    
    // Generate claim token
    const claimToken = generateClaimToken();
    const tokenHash = crypto
      .createHash('sha256')
      .update(claimToken)
      .digest('hex');

    // Create gift on smart contract
    const tx = await contracts.productStoreAdmin.createGift(
      productId,
      encryptedEmail,
      recipientMessage || ''
    );

    const receipt = await waitForTransaction(tx, 'GiftCreated');

    // Extract gift ID
    let giftId = null;
    if (receipt.event && receipt.event.args) {
      giftId = receipt.event.args.giftId?.toString() || receipt.event.args[1]?.toString();
    }

    // Store gift in Supabase
    const { data: gift } = await supabase
      .from('gifts')
      .insert({
        id: giftId,
        from_user_id: req.user.id,
        product_id: productId,
        recipient_email: recipientEmail, // Store plain for email matching
        recipient_email_encrypted: encryptedEmail,
        message: recipientMessage,
        claim_token_hash: tokenHash,
        status: 'pending',
        created_at: new Date(),
      });

    // Generate claim URL
    const claimUrl = `${process.env.FRONTEND_URL}/gifts/${giftId}/claim?token=${claimToken}`;

    // Send email to recipient
    try {
      await sendEmail({
        to: recipientEmail,
        subject: `You've received a gift from ${req.user.name || 'Someone'}!`,
        template: 'gift-received',
        data: {
          senderName: req.user.name,
          productName: product.name,
          message: recipientMessage,
          claimUrl,
          expiresIn: '90 days',
        },
      });
    } catch (emailError) {
      console.error('Email send failed:', emailError);
      // Don't fail if email fails - gift still created
    }

    return res.json({
      success: true,
      gift: {
        giftId,
        productId,
        recipientEmail,
        claimUrl,
      },
      transactionHash: receipt.transactionHash,
      message: 'Gift created! Email sent to recipient with claim link.',
    });
  } catch (error) {
    console.error('Gift creation error:', error);
    return res.status(500).json({
      error: 'Gift creation failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/gifts/:id/claim-link
 * Verify and generate authenticated claim link
 */
router.get('/:id/claim-link', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Claim token required' });
    }

    // Verify token
    const { data: gift } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    if (gift.status === 'claimed') {
      return res.status(400).json({ error: 'Gift already claimed' });
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    if (tokenHash !== gift.claim_token_hash) {
      return res.status(401).json({ error: 'Invalid claim token' });
    }

    // Token valid - return gift details
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', gift.product_id)
      .single();

    return res.json({
      valid: true,
      gift: {
        giftId: gift.id,
        productId: gift.product_id,
        productName: product.name,
        productDescription: product.description,
        message: gift.message,
        senderName: gift.from_user?.name || 'Anonymous',
      },
      token, // Return for next claim step
    });
  } catch (error) {
    console.error('Claim link error:', error);
    return res.status(500).json({
      error: 'Verification failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/gifts/:id/claim
 * Claim gift and transfer NFT to recipient
 */
router.post('/:id/claim', requireAuth, async (req, res) => {
  try {
    const validation = claimGiftSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { giftId, claimToken } = validation.data;
    const giftId2 = req.params.id;

    if (giftId !== giftId2) {
      return res.status(400).json({ error: 'Gift ID mismatch' });
    }

    // Get gift
    const { data: gift } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', giftId)
      .single();

    if (!gift) {
      return res.status(404).json({ error: 'Gift not found' });
    }

    if (gift.status === 'claimed') {
      return res.status(400).json({ error: 'Gift already claimed' });
    }

    // Verify claim token
    const tokenHash = crypto
      .createHash('sha256')
      .update(claimToken)
      .digest('hex');

    if (tokenHash !== gift.claim_token_hash) {
      return res.status(401).json({ error: 'Invalid claim token' });
    }

    // Verify recipient email matches user email
    if (gift.recipient_email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        error: 'This gift is not for you',
        recipientEmail: gift.recipient_email,
      });
    }

    // Claim on smart contract
    const tx = await contracts.productStore.connect(
      new ethers.Wallet(req.user.privateKey, require('../api/web3-contracts').getProvider())
    ).claimGift(giftId);

    const receipt = await waitForTransaction(tx, 'GiftClaimed');

    // Extract NFT ID
    let nftId = null;
    if (receipt.event && receipt.event.args) {
      nftId = receipt.event.args.tokenId?.toString() || receipt.event.args[2]?.toString();
    }

    // Update gift status
    await supabase
      .from('gifts')
      .update({
        status: 'claimed',
        claimed_by: req.user.wallet,
        claimed_at: new Date(),
        transaction_hash: receipt.transactionHash,
      })
      .eq('id', giftId);

    // Send confirmation email to sender
    const { data: sender } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', gift.from_user_id)
      .single();

    try {
      await sendEmail({
        to: sender.email,
        subject: 'Your gift has been claimed!',
        template: 'gift-claimed',
        data: {
          recipientEmail: gift.recipient_email,
          claimedAt: new Date(),
        },
      });
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError);
    }

    return res.json({
      success: true,
      claim: {
        giftId,
        nftId,
        claimedBy: req.user.wallet,
        claimedAt: new Date(),
      },
      transactionHash: receipt.transactionHash,
      message: 'Gift claimed! NFT transferred to your wallet.',
    });
  } catch (error) {
    console.error('Claim error:', error);
    return res.status(500).json({
      error: 'Gift claim failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/gifts/pending
 * Get pending gifts received by user
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const { data: gifts } = await supabase
      .from('gifts')
      .select(`
        *,
        product:product_id(name, description),
        sender:from_user_id(name, avatar)
      `)
      .eq('recipient_email', req.user.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return res.json({
      gifts: gifts || [],
      count: gifts?.length || 0,
    });
  } catch (error) {
    console.error('Pending gifts error:', error);
    return res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/gifts/sent
 * Get gifts sent by user
 */
router.get('/sent', requireAuth, async (req, res) => {
  try {
    const { data: gifts } = await supabase
      .from('gifts')
      .select(`
        *,
        product:product_id(name, description)
      `)
      .eq('from_user_id', req.user.id)
      .order('created_at', { ascending: false });

    return res.json({
      gifts: gifts || [],
      count: gifts?.length || 0,
    });
  } catch (error) {
    console.error('Sent gifts error:', error);
    return res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

module.exports = router;
