/**
 * On-Chain Event Listeners
 * Listens to smart contract events and creates notifications
 * Location: server/services/eventListeners.js
 */

const { ethers } = require('ethers');
const notificationService = require('./notifications');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get RPC provider
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

/**
 * Listen to Artist Contract subscription events
 * Triggers when: creator.on('NewSubscriber')
 */
async function listenToSubscriptionEvents(artistContractAddress, artistId, artistWallet, artistContractABI) {
  try {
    console.log(`🔄 Setting up subscription listener for ${artistWallet}`);

    const contract = new ethers.Contract(
      artistContractAddress,
      artistContractABI,
      provider
    );

    // Listen to 'NewSubscriber' event
    contract.on('NewSubscriber', async (subscriber, priceEth, expiryTimestamp, txEvent) => {
      try {
        console.log(`✅ New subscriber event detected for ${artistWallet}`);
        console.log(`   Subscriber: ${subscriber}, Price: ${priceEth} ETH`);

        // Format address for display
        const displayName = formatAddress(subscriber);

        // Create notification
        await notificationService.createNotification({
          creatorId: artistId,
          creatorWallet: artistWallet,
          eventType: 'subscription',
          eventId: txEvent.transactionHash, // Use tx hash to prevent duplicates
          title: '🎉 New Subscriber!',
          message: `${displayName} subscribed for ${ethers.formatEther(priceEth)} ETH/month`,
          data: {
            interactorWallet: subscriber,
            interactorName: displayName,
            amountEth: parseFloat(ethers.formatEther(priceEth)),
            expiryTimestamp: expiryTimestamp.toString(),
            actionUrl: `/studio/subscribers`
          }
        });
      } catch (error) {
        console.error('❌ Error processing subscription event:', error);
      }
    });

    // Handle listener errors
    contract.on('error', (error) => {
      console.error(`❌ Subscription listener error for ${artistWallet}:`, error);
    });

    console.log(`✅ Subscription listener active for ${artistWallet}`);
  } catch (error) {
    console.error(`❌ Error setting up subscription listener:`, error);
  }
}

/**
 * Listen to ProductStore purchase events
 * Triggers when: productStore.on('PurchaseCompleted')
 */
async function listenToPurchaseEvents(productStoreAddress, productStoreABI) {
  try {
    console.log(`🔄 Setting up purchase listener for ProductStore`);

    const contract = new ethers.Contract(
      productStoreAddress,
      productStoreABI,
      provider
    );

    // Listen to 'PurchaseCompleted' event
    contract.on('PurchaseCompleted', async (orderId, buyer, productId, quantity, totalPrice, txEvent) => {
      try {
        console.log(`✅ Purchase event detected`);
        console.log(`   Order: ${orderId}, Buyer: ${buyer}, Quantity: ${quantity}`);

        // Get product details from database
        const { data: product } = await supabase
          .from('products')
          .select('id, name, creator_wallet')
          .eq('id', productId)
          .single();

        if (!product) {
          console.warn(`⚠️  Product not found: ${productId}`);
          return;
        }

        const displayName = formatAddress(buyer);
        const priceEth = parseFloat(ethers.formatEther(totalPrice));

        // Create notification for creator
        await notificationService.createNotification({
          creatorWallet: product.creator_wallet,
          eventType: 'purchase',
          eventId: orderId.toString(), // Use order ID for deduplication
          title: `🛍️ Product Sold!`,
          message: `${displayName} bought ${quantity}x "${product.name}" for ${priceEth.toFixed(4)} ETH`,
          data: {
            interactorWallet: buyer,
            interactorName: displayName,
            productId: product.id,
            productName: product.name,
            quantity: parseInt(quantity),
            amountEth: priceEth,
            actionUrl: `/studio/products/${product.id}/orders/${orderId}`
          }
        });
      } catch (error) {
        console.error('❌ Error processing purchase event:', error);
      }
    });

    // Handle listener errors
    contract.on('error', (error) => {
      console.error(`❌ Purchase listener error:`, error);
    });

    console.log(`✅ Purchase listener active for ProductStore`);
  } catch (error) {
    console.error(`❌ Error setting up purchase listener:`, error);
  }
}

/**
 * Format wallet address for display
 */
function formatAddress(address) {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Initialize all event listeners
 * Call this once when server starts
 */
async function initializeEventListeners() {
  try {
    console.log(`\n🎯 Initializing on-chain event listeners...\n`);

    // Get all active artists with contracts
    const { data: artists } = await supabase
      .from('artists')
      .select('id, wallet, contract_address')
      .not('contract_address', 'is', null);

    if (artists && artists.length > 0) {
      console.log(`📋 Found ${artists.length} artists with deployed contracts`);

      // Load artist contract ABI
      const artistABI = require('../config').ARTIST_CONTRACT_ABI || [];

      // Set up subscription listener for each artist
      for (const artist of artists) {
        if (artist.contract_address) {
          listenToSubscriptionEvents(
            artist.contract_address,
            artist.id,
            artist.wallet,
            artistABI
          );
        }
      }
    }

    // Set up purchase listener for ProductStore
    const productStoreAddress = process.env.PRODUCT_STORE_ADDRESS;
    if (productStoreAddress) {
      const productStoreABI = require('../config').PRODUCT_STORE_ABI || [];
      listenToPurchaseEvents(productStoreAddress, productStoreABI);
    } else {
      console.warn('⚠️  PRODUCT_STORE_ADDRESS not set in env');
    }

    console.log(`✅ Event listeners initialized\n`);
  } catch (error) {
    console.error('❌ Error initializing event listeners:', error);
  }
}

/**
 * Stop all event listeners (cleanup)
 */
function stopAllListeners() {
  try {
    console.log('🛑 Stopping all event listeners...');
    // Note: In ethers.js v6, listeners are managed per contract instance
    // Need to track and remove them properly
  } catch (error) {
    console.error('Error stopping listeners:', error);
  }
}

module.exports = {
  initializeEventListeners,
  listenToSubscriptionEvents,
  listenToPurchaseEvents,
  stopAllListeners
};
