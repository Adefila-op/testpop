/**
 * Auction Routes - English auction endpoints
 * Handles auction creation, bidding, and settlement
 */

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const ethers = require('ethers');
const supabase = require('../integrations/supabase');
const { contracts, validateCreatorApproved, waitForTransaction } = require('../api/web3-contracts');
const { requireAuth } = require('../middleware/auth');

// Validation schemas
const createAuctionSchema = z.object({
  productId: z.number().positive(),
  startPrice: z.string(), // wei as string
  duration: z.number().int().positive(), // seconds
  minBidIncrement: z.number().int().min(100).max(1000), // bps (1% to 10%)
});

const placeBidSchema = z.object({
  amount: z.string(), // wei as string
});

/**
 * POST /api/auctions/create
 * Create new auction for a product
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const validation = createAuctionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { productId, startPrice, duration, minBidIncrement } = validation.data;

    // Get product and verify creator
    const { data: product } = await supabase
      .from('products')
      .select('creator_id')
      .eq('id', productId)
      .single();

    if (!product || product.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to auction this product' });
    }

    // Create auction on smart contract
    const tx = await contracts.productStoreAdmin.createAuction(
      productId,
      ethers.BigNumber.from(startPrice),
      duration,
      minBidIncrement
    );

    const receipt = await waitForTransaction(tx, 'AuctionCreated');

    // Extract auction ID
    let auctionId = null;
    if (receipt.event && receipt.event.args) {
      auctionId = receipt.event.args.auctionId?.toString() || receipt.event.args[1]?.toString();
    }

    // Calculate end time
    const endTime = Math.floor(Date.now() / 1000) + duration;

    // Record in Supabase
    await supabase
      .from('auctions')
      .insert({
        id: auctionId,
        product_id: productId,
        creator_id: req.user.id,
        start_price: startPrice,
        current_bid: startPrice,
        current_bidder: null,
        end_time: new Date(endTime * 1000),
        min_bid_increment: minBidIncrement,
        status: 'active',
        created_at: new Date(),
      });

    return res.json({
      success: true,
      auctionId,
      startPrice,
      duration,
      endTime,
      transactionHash: receipt.transactionHash,
    });
  } catch (error) {
    console.error('Auction creation error:', error);
    return res.status(500).json({
      error: 'Auction creation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/auctions/:id/bids
 * Place bid on auction
 */
router.post('/:id/bids', requireAuth, async (req, res) => {
  try {
    const validation = placeBidSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { amount } = validation.data;
    const auctionId = req.params.id;

    // Get auction details
    const { data: auction } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({ error: 'Auction is not active' });
    }

    // Verify minimum bid increment
    const currentBid = ethers.BigNumber.from(auction.current_bid);
    const bidAmount = ethers.BigNumber.from(amount);
    const minIncrement = currentBid.mul(auction.min_bid_increment).div(10000);
    const minimumBid = currentBid.add(minIncrement);

    if (bidAmount.lt(minimumBid)) {
      return res.status(400).json({
        error: 'Bid too low',
        minimumBid: minimumBid.toString(),
        minimumBidEth: ethers.utils.formatEther(minimumBid),
        currentBid: currentBid.toString(),
        currentBidEth: ethers.utils.formatEther(currentBid),
      });
    }

    // Check if auction is within extension threshold
    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();
    const timeUntilEnd = (endTime - now) / 1000; // seconds

    let newEndTime = endTime;
    if (timeUntilEnd <= 300) { // 5 minutes
      newEndTime = now + 5 * 60 * 1000; // Extend by 5 minutes
    }

    // Place bid on smart contract
    const tx = await contracts.productStore.connect(
      new ethers.Wallet(req.user.privateKey, require('../api/web3-contracts').getProvider())
    ).placeBid(auctionId, bidAmount, { value: bidAmount });

    const receipt = await waitForTransaction(tx, 'BidPlaced');

    // Record bid in Supabase
    await supabase
      .from('auction_bids')
      .insert({
        auction_id: auctionId,
        bidder_id: req.user.id,
        bidder_wallet: req.user.wallet,
        amount: amount,
        timestamp: new Date(),
        transaction_hash: receipt.transactionHash,
      });

    // Update auction current bid
    await supabase
      .from('auctions')
      .update({
        current_bid: amount,
        current_bidder: req.user.wallet,
        end_time: new Date(newEndTime),
      })
      .eq('id', auctionId);

    return res.json({
      success: true,
      bid: {
        auctionId,
        bidAmount: amount,
        bidAmountEth: ethers.utils.formatEther(bidAmount),
        newEndTime: newEndTime / 1000,
      },
      extended: newEndTime > endTime,
      transactionHash: receipt.transactionHash,
    });
  } catch (error) {
    console.error('Bid error:', error);
    return res.status(500).json({
      error: 'Bid placement failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/auctions/:id
 * Get auction details and bid history
 */
router.get('/:id', async (req, res) => {
  try {
    const auctionId = req.params.id;

    // Get auction
    const { data: auction } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Get bid history
    const { data: bids } = await supabase
      .from('auction_bids')
      .select('*')
      .eq('auction_id', auctionId)
      .order('timestamp', { ascending: false });

    const highestBid = bids?.[0] || null;

    return res.json({
      auction,
      bidCount: bids?.length || 0,
      highestBid,
      bids: bids || [],
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/auctions/:id/history
 * Get complete bid history with pagination
 */
router.get('/:id/history', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const auctionId = req.params.id;

    const { data: bids, count } = await supabase
      .from('auction_bids')
      .select('*', { count: 'exact' })
      .eq('auction_id', auctionId)
      .order('timestamp', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    return res.json({
      auctionId,
      bids,
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
 * GET /api/auctions/validate-increment
 * Validate if bid meets minimum increment
 */
router.get('/validate-increment', async (req, res) => {
  try {
    const { auctionId, currentBid, newBid } = req.query;

    const { data: auction } = await supabase
      .from('auctions')
      .select('min_bid_increment')
      .eq('id', auctionId)
      .single();

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const current = ethers.BigNumber.from(currentBid);
    const newAmount = ethers.BigNumber.from(newBid);
    const minIncrement = current.mul(auction.min_bid_increment).div(10000);
    const minBid = current.add(minIncrement);

    const isValid = newAmount.gte(minBid);

    return res.json({
      valid: isValid,
      currentBid,
      minimumBid: minBid.toString(),
      proposedBid: newBid,
      minIncrement: minIncrement.toString(),
    });
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      error: 'Validation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/auctions/:id/settle
 * Settle completed auction (admin only)
 */
router.post('/:id/settle', requireAuth, async (req, res) => {
  try {
    const auctionId = req.params.id;

    const { data: auction } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if auction has ended
    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();
    
    if (now < endTime) {
      return res.status(400).json({
        error: 'Auction has not ended yet',
        endsAt: auction.end_time,
      });
    }

    if (!auction.current_bidder) {
      return res.status(400).json({
        error: 'No bids on this auction',
      });
    }

    // Settle on smart contract
    const tx = await contracts.productStoreAdmin.settleAuction(
      auctionId,
      auction.current_bidder,
      ethers.BigNumber.from(auction.current_bid)
    );

    const receipt = await waitForTransaction(tx, 'AuctionSettled');

    // Update auction status
    await supabase
      .from('auctions')
      .update({ status: 'settled' })
      .eq('id', auctionId);

    return res.json({
      success: true,
      auctionId,
      winner: auction.current_bidder,
      finalPrice: auction.current_bid,
      transactionHash: receipt.transactionHash,
    });
  } catch (error) {
    console.error('Settlement error:', error);
    return res.status(500).json({
      error: 'Settlement failed',
      message: error.message,
    });
  }
});

module.exports = router;
