/**
 * Smart Contract Integration Layer
 * Location: server/api/contracts.js
 * 
 * Initializes ethers.js contract instances and provides high-level
 * contract interaction functions for the backend API
 */

import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

const RPC_URL = process.env.RPC_URL;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111");

const CONTRACT_ADDRESSES = {
  productStore: process.env.PRODUCT_STORE_ADDRESS,
  payoutDistributor: process.env.PAYOUT_DISTRIBUTOR_ADDRESS,
  auctionManager: process.env.AUCTION_MANAGER_ADDRESS,
  royaltyManager: process.env.ROYALTY_MANAGER_ADDRESS,
};

const TOKEN_ADDRESSES = {
  usdc: process.env.USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  usdt: process.env.USDT_ADDRESS || "0xdAC17F958D2ee523a2206206994597C13D831ec7",
};

// ═════════════════════════════════════════════════════════════════════════════
// PROVIDER & SIGNER SETUP
// ═════════════════════════════════════════════════════════════════════════════

let provider;
let signer;

function initializeProvider() {
  if (!RPC_URL) {
    throw new Error("RPC_URL environment variable is required");
  }
  
  provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  console.log(`✅ Provider initialized on chain ${CHAIN_ID}`);
  return provider;
}

function initializeSigner() {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error("ADMIN_PRIVATE_KEY environment variable is required");
  }
  
  if (!provider) {
    initializeProvider();
  }
  
  signer = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  console.log(`✅ Signer initialized: ${signer.address}`);
  return signer;
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTRACT INSTANCES
// ═════════════════════════════════════════════════════════════════════════════

// Minimal ABIs for essential functions
const MINIMAL_ABIS = {
  productStore: [
    "function createProduct(string name, string description, uint256 supply, uint256 price, uint16 royaltyBps, string metadataUri) returns (uint256)",
    "function purchaseProduct(uint256 productId, uint256 quantity) payable returns (uint256[])",
    "function createAuction(uint256 productId, uint256 startPrice, uint256 duration, uint256 minBidIncrement) returns (uint256)",
    "function placeBid(uint256 auctionId, uint256 amount) payable returns (bool)",
    "function getAuctionState(uint256 auctionId) view returns (tuple(uint256 id, uint256 productId, address seller, uint256 startPrice, uint256 highestBid, address highestBidder, uint256 endTime, bool settled))",
    "function createGift(uint256 productId, address recipient, string message) returns (uint256)",
    "function claimGift(uint256 giftId) returns (uint256)",
    "event ProductCreated(uint256 indexed productId, address indexed creator, string name)",
    "event ProductPurchased(uint256 indexed productId, address indexed buyer, uint256[] tokenIds)",
    "event AuctionCreated(uint256 indexed auctionId, uint256 indexed productId)",
    "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount)",
    "event GiftCreated(uint256 indexed giftId, uint256 indexed productId)",
    "event GiftClaimed(uint256 indexed giftId, address indexed recipient)",
  ],
  payoutDistributor: [
    "function setPayoutMethod(uint8 method, address payoutAddress) returns (bool)",
    "function claimEscrowPayout(uint8 method) payable returns (uint256)",
    "function getCreatorEscrow(address creator) view returns (uint256)",
    "function creatorPayoutMethod(address creator) view returns (uint8)",
    "event PayoutClaimed(address indexed creator, uint8 method, uint256 amount)",
  ],
  auctionManager: [
    "function getBidHistory(uint256 auctionId) view returns (tuple(address bidder, uint256 amount, uint256 timestamp)[])",
    "function getHighestBid(uint256 auctionId) view returns (tuple(address bidder, uint256 amount))",
    "function settleAuction(uint256 auctionId) returns (bool)",
  ],
  royaltyManager: [
    "function recordRoyaltyPayment(address collection, uint256 tokenId, uint256 amount, string marketplace) payable returns (bool)",
    "function claimRoyalties(address token) returns (uint256)",
    "function getRoyaltyConfig(address collection, uint256 tokenId) view returns (tuple(address creator, uint16 royaltyBps))",
    "event RoyaltyPaid(address indexed collection, uint256 indexed tokenId, address indexed creator, uint256 amount)",
  ],
};

let contracts = {};

function initializeContracts() {
  if (!signer && !provider) {
    if (!provider) initializeProvider();
    if (!signer) initializeSigner();
  }

  contracts = {
    productStore: new ethers.Contract(
      CONTRACT_ADDRESSES.productStore,
      MINIMAL_ABIS.productStore,
      signer || provider
    ),
    payoutDistributor: new ethers.Contract(
      CONTRACT_ADDRESSES.payoutDistributor,
      MINIMAL_ABIS.payoutDistributor,
      signer || provider
    ),
    auctionManager: new ethers.Contract(
      CONTRACT_ADDRESSES.auctionManager,
      MINIMAL_ABIS.auctionManager,
      signer || provider
    ),
    royaltyManager: new ethers.Contract(
      CONTRACT_ADDRESSES.royaltyManager,
      MINIMAL_ABIS.royaltyManager,
      signer || provider
    ),
  };

  console.log("✅ Contract instances initialized");
  return contracts;
}

// ═════════════════════════════════════════════════════════════════════════════
// HIGH-LEVEL CONTRACT INTERACTION FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Create a new product on the blockchain
 */
export async function createProduct(productData) {
  try {
    if (!contracts.productStore) initializeContracts();

    const {
      name,
      description,
      supply,
      priceEth,
      royaltyBps,
      metadataUri,
    } = productData;

    console.log(`🔄 Creating product: ${name}`);

    const priceWei = ethers.parseEther(priceEth);
    const tx = await contracts.productStore.createProduct(
      name,
      description,
      supply,
      priceWei,
      royaltyBps,
      metadataUri
    );

    const receipt = await tx.wait();
    console.log(`✅ Product created at tx: ${receipt.hash}`);

    // Extract product ID from event
    const event = receipt.logs
      .map(log => {
        try {
          return contracts.productStore.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event?.name === "ProductCreated");

    const productId = event?.args?.productId || null;
    return { productId, transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error creating product:", error);
    throw error;
  }
}

/**
 * Purchase a product
 */
export async function purchaseProduct(productId, quantity, userAddress) {
  try {
    if (!contracts.productStore) initializeContracts();

    console.log(
      `🔄 Purchasing product ${productId}, quantity: ${quantity}`
    );

    const tx = await contracts.productStore.purchaseProduct(productId, quantity);
    const receipt = await tx.wait();

    console.log(`✅ Product purchased at tx: ${receipt.hash}`);

    // Extract token IDs from event
    const event = receipt.logs
      .map(log => {
        try {
          return contracts.productStore.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event?.name === "ProductPurchased");

    const tokenIds = event?.args?.tokenIds || [];
    return { tokenIds, transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error purchasing product:", error);
    throw error;
  }
}

/**
 * Estimate gas cost for a product purchase
 */
export async function estimatePurchaseGas(productId, quantity) {
  try {
    if (!contracts.productStore) initializeContracts();

    const gasEstimate = await contracts.productStore.purchaseProduct.estimateGas(
      productId,
      quantity
    );

    const gasPrice = await provider.getGasPrice();
    const estimatedCost = gasEstimate * gasPrice;

    return {
      gasLimit: gasEstimate.toString(),
      gasPrice: gasPrice.toString(),
      estimatedCostEth: ethers.formatEther(estimatedCost),
    };
  } catch (error) {
    console.error("❌ Error estimating gas:", error);
    throw error;
  }
}

/**
 * Create an auction for a product
 */
export async function createAuction(auctionData) {
  try {
    if (!contracts.productStore) initializeContracts();

    const { productId, startPriceEth, durationSeconds, minBidIncrementEth } =
      auctionData;

    console.log(`🔄 Creating auction for product ${productId}`);

    const startPrice = ethers.parseEther(startPriceEth);
    const minBidIncrement = ethers.parseEther(minBidIncrementEth);

    const tx = await contracts.productStore.createAuction(
      productId,
      startPrice,
      durationSeconds,
      minBidIncrement
    );

    const receipt = await tx.wait();
    console.log(`✅ Auction created at tx: ${receipt.hash}`);

    const event = receipt.logs
      .map(log => {
        try {
          return contracts.productStore.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event?.name === "AuctionCreated");

    const auctionId = event?.args?.auctionId || null;
    return { auctionId, transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error creating auction:", error);
    throw error;
  }
}

/**
 * Place a bid on an auction
 */
export async function placeBid(auctionId, bidAmountEth) {
  try {
    if (!contracts.productStore) initializeContracts();

    console.log(
      `🔄 Placing bid on auction ${auctionId}, amount: ${bidAmountEth} ETH`
    );

    const bidAmount = ethers.parseEther(bidAmountEth);
    const tx = await contracts.productStore.placeBid(auctionId, bidAmount, {
      value: bidAmount,
    });

    const receipt = await tx.wait();
    console.log(`✅ Bid placed at tx: ${receipt.hash}`);

    return { transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error placing bid:", error);
    throw error;
  }
}

/**
 * Get auction state and bid history
 */
export async function getAuctionDetails(auctionId) {
  try {
    if (!contracts.productStore || !contracts.auctionManager)
      initializeContracts();

    const state = await contracts.productStore.getAuctionState(auctionId);
    const bidHistory =
      await contracts.auctionManager.getBidHistory(auctionId);

    return {
      state: {
        id: state[0].toString(),
        productId: state[1].toString(),
        seller: state[2],
        startPrice: ethers.formatEther(state[3]),
        highestBid: ethers.formatEther(state[4]),
        highestBidder: state[5],
        endTime: state[6].toString(),
        settled: state[7],
      },
      bidHistory: bidHistory.map(bid => ({
        bidder: bid[0],
        amount: ethers.formatEther(bid[1]),
        timestamp: bid[2].toString(),
      })),
    };
  } catch (error) {
    console.error("❌ Error getting auction details:", error);
    throw error;
  }
}

/**
 * Create a gift
 */
export async function createGift(giftData) {
  try {
    if (!contracts.productStore) initializeContracts();

    const { productId, recipientAddress, message } = giftData;

    console.log(`🔄 Creating gift for product ${productId}`);

    const tx = await contracts.productStore.createGift(
      productId,
      recipientAddress,
      message
    );

    const receipt = await tx.wait();
    console.log(`✅ Gift created at tx: ${receipt.hash}`);

    const event = receipt.logs
      .map(log => {
        try {
          return contracts.productStore.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event?.name === "GiftCreated");

    const giftId = event?.args?.giftId || null;
    return { giftId, transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error creating gift:", error);
    throw error;
  }
}

/**
 * Claim a gift
 */
export async function claimGift(giftId) {
  try {
    if (!contracts.productStore) initializeContracts();

    console.log(`🔄 Claiming gift ${giftId}`);

    const tx = await contracts.productStore.claimGift(giftId);
    const receipt = await tx.wait();

    console.log(`✅ Gift claimed at tx: ${receipt.hash}`);

    const event = receipt.logs
      .map(log => {
        try {
          return contracts.productStore.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event?.name === "GiftClaimed");

    const tokenId = event?.args?.tokenId || null;
    return { tokenId, transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error claiming gift:", error);
    throw error;
  }
}

/**
 * Set creator payout method
 */
export async function setPayoutMethod(creatorAddress, method, payoutAddress) {
  try {
    if (!contracts.payoutDistributor) initializeContracts();

    console.log(`🔄 Setting payout method for ${creatorAddress}`);

    const tx = await contracts.payoutDistributor.setPayoutMethod(
      method,
      payoutAddress
    );
    const receipt = await tx.wait();

    console.log(`✅ Payout method set at tx: ${receipt.hash}`);
    return { transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error setting payout method:", error);
    throw error;
  }
}

/**
 * Get creator earnings
 */
export async function getCreatorEarnings(creatorAddress) {
  try {
    if (!contracts.payoutDistributor) initializeContracts();

    const escrowAmount = await contracts.payoutDistributor.getCreatorEscrow(
      creatorAddress
    );
    const payoutMethod =
      await contracts.payoutDistributor.creatorPayoutMethod(creatorAddress);

    return {
      pendingEth: ethers.formatEther(escrowAmount),
      payoutMethod: payoutMethod,
    };
  } catch (error) {
    console.error("❌ Error getting creator earnings:", error);
    throw error;
  }
}

/**
 * Claim creator payouts
 */
export async function claimCreatorPayout(method) {
  try {
    if (!contracts.payoutDistributor) initializeContracts();

    console.log(`🔄 Claiming payout with method ${method}`);

    const tx = await contracts.payoutDistributor.claimEscrowPayout(method);
    const receipt = await tx.wait();

    console.log(`✅ Payout claimed at tx: ${receipt.hash}`);

    const event = receipt.logs
      .map(log => {
        try {
          return contracts.payoutDistributor.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event => event?.name === "PayoutClaimed");

    const claimedAmount = event?.args?.amount
      ? ethers.formatEther(event.args.amount)
      : "0";

    return { claimedAmount, transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error claiming payout:", error);
    throw error;
  }
}

/**
 * Record royalty payment
 */
export async function recordRoyaltyPayment(royaltyData) {
  try {
    if (!contracts.royaltyManager) initializeContracts();

    const { collectionAddress, tokenId, salePrice, marketplace } =
      royaltyData;

    console.log(`🔄 Recording royalty for token ${tokenId}`);

    const salePriceWei = ethers.parseEther(salePrice);
    const tx = await contracts.royaltyManager.recordRoyaltyPayment(
      collectionAddress,
      tokenId,
      salePriceWei,
      marketplace,
      { value: salePriceWei }
    );

    const receipt = await tx.wait();
    console.log(`✅ Royalty recorded at tx: ${receipt.hash}`);

    return { transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error recording royalty:", error);
    throw error;
  }
}

/**
 * Claim royalties
 */
export async function claimRoyalties(tokenAddress) {
  try {
    if (!contracts.royaltyManager) initializeContracts();

    console.log(`🔄 Claiming royalties for token ${tokenAddress}`);

    const tx = await contracts.royaltyManager.claimRoyalties(tokenAddress);
    const receipt = await tx.wait();

    console.log(`✅ Royalties claimed at tx: ${receipt.hash}`);

    return { transactionHash: receipt.hash };
  } catch (error) {
    console.error("❌ Error claiming royalties:", error);
    throw error;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// INITIALIZATION AND EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

// Initialize on module load
try {
  initializeProvider();
  initializeSigner();
  initializeContracts();
} catch (error) {
  console.error("⚠️  Failed to initialize contracts:", error.message);
}

export {
  initializeProvider,
  initializeSigner,
  initializeContracts,
  provider,
  signer,
  contracts,
  CONTRACT_ADDRESSES,
  TOKEN_ADDRESSES,
};
