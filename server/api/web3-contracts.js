/**
 * Web3 Contract Integration Layer
 * Manages all interactions with deployed smart contracts
 * Initializes ethers.js instances and exports contract objects
 */

const ethers = require('ethers');
const { Wallet } = require('ethers');

// Load ABIs (these will be in contracts/abi/ directory after compilation)
let productStoreABI = [];
let payoutDistributorABI = [];
let auctionManagerABI = [];
let royaltyManagerABI = [];

try {
  productStoreABI = require('../contracts-abi/PopupProductStore.json');
  payoutDistributorABI = require('../contracts-abi/PopupPayoutDistributor.json');
  auctionManagerABI = require('../contracts-abi/PopupAuctionManager.json');
  royaltyManagerABI = require('../contracts-abi/PopupRoyaltyManager.json');
} catch (e) {
  console.warn('ABIs not found - using empty arrays. Make sure to export ABIs after contract compilation.');
}

// Initialize provider based on chain
const getProvider = () => {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error('RPC_URL not configured in .env');
  }
  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

// Initialize admin signer (for backend-initiated transactions)
const getAdminSigner = () => {
  const provider = getProvider();
  const privateKey = process.env.ADMIN_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('ADMIN_PRIVATE_KEY not configured in .env');
  }
  
  return new Wallet(privateKey, provider);
};

// Validate contract addresses
const validateAddress = (address, label) => {
  if (!ethers.utils.isAddress(address)) {
    throw new Error(`Invalid ${label} address: ${address}`);
  }
  return ethers.utils.getAddress(address);
};

// Contract instances
let contracts = null;

const initializeContracts = () => {
  if (contracts) return contracts;

  try {
    const provider = getProvider();
    const adminSigner = getAdminSigner();

    const productStoreAddr = validateAddress(
      process.env.PRODUCT_STORE_ADDRESS,
      'ProductStore'
    );
    const payoutDistributorAddr = validateAddress(
      process.env.PAYOUT_DISTRIBUTOR_ADDRESS,
      'PayoutDistributor'
    );
    const auctionManagerAddr = validateAddress(
      process.env.AUCTION_MANAGER_ADDRESS,
      'AuctionManager'
    );
    const royaltyManagerAddr = validateAddress(
      process.env.ROYALTY_MANAGER_ADDRESS,
      'RoyaltyManager'
    );

    contracts = {
      provider,
      adminSigner,
      
      // Contract instances (read-only via provider)
      productStore: new ethers.Contract(
        productStoreAddr,
        productStoreABI,
        provider
      ),
      
      payoutDistributor: new ethers.Contract(
        payoutDistributorAddr,
        payoutDistributorABI,
        provider
      ),
      
      auctionManager: new ethers.Contract(
        auctionManagerAddr,
        auctionManagerABI,
        provider
      ),
      
      royaltyManager: new ethers.Contract(
        royaltyManagerAddr,
        royaltyManagerABI,
        provider
      ),

      // Contract instances (write-enabled via adminSigner)
      productStoreAdmin: new ethers.Contract(
        productStoreAddr,
        productStoreABI,
        adminSigner
      ),
      
      payoutDistributorAdmin: new ethers.Contract(
        payoutDistributorAddr,
        payoutDistributorABI,
        adminSigner
      ),
      
      auctionManagerAdmin: new ethers.Contract(
        auctionManagerAddr,
        auctionManagerABI,
        adminSigner
      ),
      
      royaltyManagerAdmin: new ethers.Contract(
        royaltyManagerAddr,
        royaltyManagerABI,
        adminSigner
      ),
    };

    console.log('✓ Web3 contracts initialized successfully');
    return contracts;
  } catch (error) {
    console.error('Failed to initialize contracts:', error.message);
    throw error;
  }
};

/**
 * Helper: Estimate gas and calculate total cost
 */
const estimateGasCost = async (tx, gasPrice = null) => {
  try {
    const provider = getProvider();
    if (!gasPrice) {
      gasPrice = await provider.getGasPrice();
    }
    
    const estimatedGas = await tx.estimateGas();
    const totalCost = estimatedGas.mul(gasPrice);
    
    return {
      gas: estimatedGas.toString(),
      gasPrice: gasPrice.toString(),
      totalCost: totalCost.toString(),
      totalCostEth: ethers.utils.formatEther(totalCost),
    };
  } catch (error) {
    console.error('Gas estimation failed:', error.message);
    throw error;
  }
};

/**
 * Helper: Wait for transaction and extract events
 */
const waitForTransaction = async (txPromise, eventName = null) => {
  try {
    const tx = await txPromise;
    const receipt = await tx.wait(1); // Wait for 1 confirmation
    
    const result = {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1 ? 'success' : 'failed',
    };

    // Extract event if requested
    if (eventName && receipt.events) {
      const event = receipt.events.find(e => e.event === eventName);
      if (event) {
        result.event = {
          name: event.event,
          args: event.args.reduce((acc, arg, idx) => {
            acc[idx] = arg;
            return acc;
          }, {}),
        };
      }
    }

    return result;
  } catch (error) {
    console.error('Transaction failed:', error.message);
    throw error;
  }
};

/**
 * Token helper: Get ERC20 contract
 */
const getTokenContract = (tokenAddress) => {
  const provider = getProvider();
  const erc20ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address account) returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) returns (uint256)',
  ];
  
  return new ethers.Contract(tokenAddress, erc20ABI, provider);
};

/**
 * Validate creator is approved
 */
const validateCreatorApproved = async (creatorAddress) => {
  const contracts_ = initializeContracts();
  
  if (typeof contracts_.productStore.isCreatorApproved === 'function') {
    const approved = await contracts_.productStore.isCreatorApproved(creatorAddress);
    if (!approved) {
      throw new Error(`Creator ${creatorAddress} is not approved`);
    }
  }
};

module.exports = {
  // Initialization
  initializeContracts,
  getProvider,
  getAdminSigner,

  // Helpers
  validateAddress,
  estimateGasCost,
  waitForTransaction,
  getTokenContract,
  validateCreatorApproved,

  // Lazy initialization - use this to get contracts
  get contracts() {
    if (!contracts) {
      initializeContracts();
    }
    return contracts;
  },
};
