/**
 * Product Routes - Marketplace product endpoints
 * Handles product creation, purchasing, and management
 */

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const ethers = require('ethers');
const supabase = require('../integrations/supabase');
const { contracts, validateCreatorApproved, waitForTransaction } = require('../api/web3-contracts');
const { requireAuth } = require('../middleware/auth');

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000),
  supply: z.number().int().positive(),
  price: z.string(), // wei as string
  royaltyBps: z.number().int().min(0).max(1000),
  metadataUri: z.string().url(),
});

const purchaseProductSchema = z.object({
  quantity: z.number().int().positive(),
  paymentMethod: z.enum(['ETH', 'USDC', 'USDT']),
});

/**
 * POST /api/products/create
 * Create new product (creator only)
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const validation = createProductSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { name, description, supply, price, royaltyBps, metadataUri } = validation.data;
    
    // Verify creator is approved
    await validateCreatorApproved(req.user.wallet);

    // Determine payment method enum (0=ETH, 1=USDC, 2=USDT)
    const paymentMethodMap = { ETH: 0, USDC: 1, USDT: 2 };

    // Call smart contract
    const tx = await contracts.productStoreAdmin.createProduct(
      req.user.wallet, // creator
      name,
      description,
      supply,
      ethers.BigNumber.from(price),
      royaltyBps,
      metadataUri
    );

    const receipt = await waitForTransaction(tx, 'ProductCreated');
    
    // Extract product ID from event
    let productId = null;
    if (receipt.event && receipt.event.args) {
      productId = receipt.event.args.productId?.toString() || receipt.event.args[1]?.toString();
    }

    // Store in Supabase
    const { data, error } = await supabase
      .from('products')
      .insert({
        id: productId,
        creator_id: req.user.id,
        name,
        description,
        supply,
        price,
        royalty_bps: royaltyBps,
        metadata: { uri: metadataUri },
        status: 'active',
        created_at: new Date(),
      });

    if (error) {
      console.error('Supabase insert error:', error);
      // Transaction succeeded but DB insert failed - log for recovery
    }

    return res.json({
      success: true,
      productId,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error) {
    console.error('Product creation error:', error);
    return res.status(500).json({
      error: 'Product creation failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/products/:id/purchase-estimate
 * Estimate gas and total cost for purchase
 */
router.get('/:id/purchase-estimate', async (req, res) => {
  try {
    const { quantity, paymentMethod } = req.query;
    
    if (!quantity || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required parameters: quantity, paymentMethod',
      });
    }

    const paymentMethodMap = { ETH: 0, USDC: 1, USDT: 2 };
    const methodEnum = paymentMethodMap[paymentMethod];

    if (methodEnum === undefined) {
      return res.status(400).json({
        error: 'Invalid payment method',
        allowed: ['ETH', 'USDC', 'USDT'],
      });
    }

    // Get product details
    const { data: product } = await supabase
      .from('products')
      .select('price, supply')
      .eq('id', req.params.id)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const totalCost = ethers.BigNumber.from(product.price).mul(quantity);

    // Estimate gas (simplified - actual would need contract call)
    const provider = require('../api/web3-contracts').getProvider();
    const gasPrice = await provider.getGasPrice();
    
    // Average gas for product purchase: 220,000
    const estimatedGas = ethers.BigNumber.from('220000');
    const gasCost = estimatedGas.mul(gasPrice);

    return res.json({
      productId: req.params.id,
      quantity: parseInt(quantity),
      pricePerUnit: product.price,
      totalProductCost: totalCost.toString(),
      totalProductCostEth: ethers.utils.formatEther(totalCost),
      estimatedGas: estimatedGas.toString(),
      gasPrice: gasPrice.toString(),
      gasCostEth: ethers.utils.formatEther(gasCost),
      totalCostEth: ethers.utils.formatEther(totalCost.add(gasCost)),
      paymentMethod,
      estimatedTime: '2-15 seconds',
    });
  } catch (error) {
    console.error('Gas estimation error:', error);
    return res.status(500).json({
      error: 'Estimation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/products/:id/purchase
 * Execute product purchase (mints NFT to buyer)
 */
router.post('/:id/purchase', requireAuth, async (req, res) => {
  try {
    const validation = purchaseProductSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { quantity, paymentMethod } = validation.data;
    const productId = req.params.id;

    // Get product details
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate total cost
    const paymentMethodMap = { ETH: 0, USDC: 1, USDT: 2 };
    const methodEnum = paymentMethodMap[paymentMethod];
    const totalCost = ethers.BigNumber.from(product.price).mul(quantity);

    // For ETH payments, user must send value
    const txOptions = {};
    if (paymentMethod === 'ETH') {
      txOptions.value = totalCost;
    }

    // Call contract
    const tx = await contracts.productStore.connect(
      new ethers.Wallet(req.user.privateKey, require('../api/web3-contracts').getProvider())
    ).purchaseProduct(productId, quantity, methodEnum, txOptions);

    const receipt = await waitForTransaction(tx, 'ProductPurchased');

    // Extract NFT IDs from event
    let nftIds = [];
    if (receipt.event && receipt.event.args) {
      nftIds = receipt.event.args.tokenIds || [];
    }

    // Record purchase in DB
    const { data: purchase } = await supabase
      .from('purchases')
      .insert({
        buyer_id: req.user.id,
        product_id: productId,
        quantity,
        price_paid: totalCost.toString(),
        payment_method: paymentMethod,
        nft_ids: nftIds,
        transaction_hash: receipt.transactionHash,
        created_at: new Date(),
      });

    // Update product sales count
    await supabase.rpc('increment_sales', {
      product_id: productId,
      amount: quantity,
    });

    return res.json({
      success: true,
      purchase: {
        productId,
        quantity,
        paymentMethod,
        nftIds,
        totalCost: totalCost.toString(),
        totalCostEth: ethers.utils.formatEther(totalCost),
      },
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error) {
    console.error('Purchase error:', error);
    return res.status(500).json({
      error: 'Purchase failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/products/:id
 * Get product details
 */
router.get('/:id', async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        creator:creator_id(id, wallet, name, avatar),
        _purchases:purchases(count)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(product);
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/products
 * List all products with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      creator_id = null,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    let query = supabase
      .from('products')
      .select('*, creator:creator_id(name, avatar)', { count: 'exact' })
      .order(sort, { ascending: order === 'asc' });

    if (creator_id) {
      query = query.eq('creator_id', creator_id);
    }

    const { data: products, count, error } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('List error:', error);
    return res.status(500).json({
      error: 'List failed',
      message: error.message,
    });
  }
});

module.exports = router;
