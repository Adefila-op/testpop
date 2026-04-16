# Phase 2 Backend API Implementation Guide

## Overview

Phase 2 focuses on implementing the backend API layer for smart contract interactions. This guide documents all endpoints, database requirements, and implementation details.

**START DATE:** April 16, 2026
**TARGET COMPLETION:** April 23, 2026 (1 week)
**STATUS:** 40% - Contract integration created, Products routes updated

---

## Completed Tasks ✅

### 1. Contract Integration Layer (server/api/contracts.js) ✅

**Status:** COMPLETE (600+ lines)

**Features Implemented:**
- ✅ Provider initialization (ethers.JsonRpcProvider)
- ✅ Signer setup (ethers.Wallet from ADMIN_PRIVATE_KEY)
- ✅ Contract instances for all 4 smart contracts
- ✅ Gas estimation utilities
- ✅ Event parsing and extraction
- ✅ Error handling and logging

**Contract Functions Available:**
```javascript
// Product Management
createProduct(productData)
purchaseProduct(productId, quantity, userAddress)
estimatePurchaseGas(productId, quantity)

// Auction Management
createAuction(auctionData)
placeBid(auctionId, bidAmountEth)
getAuctionDetails(auctionId)

// Gift System
createGift(giftData)
claimGift(giftId)

// Creator Payouts
setPayoutMethod(creatorAddress, method, payoutAddress)
getCreatorEarnings(creatorAddress)
claimCreatorPayout(method)

// Royalty Management
recordRoyaltyPayment(royaltyData)
claimRoyalties(tokenAddress)
```

**Environment Variables Required:**
```
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ADMIN_PRIVATE_KEY=0x...
CHAIN_ID=11155111
PRODUCT_STORE_ADDRESS=0x...
PAYOUT_DISTRIBUTOR_ADDRESS=0x...
AUCTION_MANAGER_ADDRESS=0x...
ROYALTY_MANAGER_ADDRESS=0x...
USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

---

## In-Progress Tasks ⏳

### 2. Products Routes (server/routes/products.js) - 70% COMPLETE

**Status:** Partially updated to ES6 with comprehensive endpoints

**Endpoints Implemented:**

#### Product Management
- **POST /api/products** - Create new product
  - Auth: RequireAuth
  - Body: `{ name, description, supply, priceEth, royaltyBps, metadataUri, category }`
  - Returns: Product object + transaction hash
  - Validation: Zod schema with min/max constraints
  - DB: Saves to `products` table

- **GET /api/products** - List products with filtering
  - Query: `category`, `creator_id`, `limit`, `offset`
  - Returns: Products array + pagination
  - DB: Queries from `products` table

- **GET /api/products/:id** - Get product details
  - Returns: Product + creator info
  - DB: Joins with `profiles` table

#### Purchase System
- **GET /api/products/:id/purchase-estimate** - Estimate gas costs
  - Query: `quantity`
  - Returns: Gas estimate + total cost
  - Calls: `estimatePurchaseGas()` from contracts.js

- **POST /api/products/:id/purchase** - Execute purchase
  - Auth: RequireAuth
  - Body: `{ quantity, paymentMethod: "eth"|"usdc"|"usdt" }`
  - Validates: Supply exists, quantity available
  - Calls: `purchaseProduct()` contract function
  - DB: Saves to `purchases` table, updates `creator_earnings`
  - Returns: Transaction hash + token IDs received

#### Auction System
- **POST /api/products/:id/auctions** - Create auction
  - Auth: RequireAuth (creator only)
  - Body: `{ startPriceEth, durationSeconds, minBidIncrementEth }`
  - Calls: `createAuction()` contract function
  - DB: Saves to `auctions` table
  - Returns: Auction ID + transaction hash

- **POST /api/auctions/:id/bids** - Place bid
  - Auth: RequireAuth
  - Body: `{ bidAmountEth }`
  - Validates: Bid >= start price + min increment
  - Auto-extends: If < 10 min remaining, extends by 10 min
  - Calls: `placeBid()` contract function
  - DB: Saves to `bids` table, updates `auctions` end_time
  - Returns: Bid record + auto-extension status

- **GET /api/auctions/:id** - Get auction details
  - Returns: Auction state + all bids
  - Calls: `getAuctionDetails()` from contract integration

- **GET /api/auctions/:id/bid-history** - Get bid history
  - Returns: Chronological bid list with bidder info

---

## Pending Tasks ⏳

### 3. Gifts Routes (server/routes/gifts.js) - NEEDS UPDATE

**Status:** Exists but needs modernization from CommonJS to ES6

**Endpoints Required:**
- **POST /api/gifts** - Create gift
  - Body: `{ productId, recipientEmail, recipientName, message }`
  - Generates: Secure claim token (SHA256 hash)
  - DB: Saves to `gifts` table
  - Email: Sends claim link to recipient
  - Returns: Gift ID + claim URL

- **GET /api/gifts/pending** - Get pending gifts for user
  - Auth: RequireAuth
  - Returns: List of unclaimed gifts received

- **POST /api/gifts/claim** - Claim gift
  - Body: `{ claimToken }`
  - Validates: Token hash matches
  - Calls: `claimGift()` contract function
  - DB: Updates `gifts` status to "claimed"
  - Returns: Token ID + transaction hash

- **GET /api/gifts/:id** - Get gift details
  - Returns: Gift + product info

**Key Features:**
- Token-based security (no wallet required for claiming)
- Email encryption for privacy
- Claim link generation with expiration

---

### 4. Creator Routes (server/routes/creator.js) - NEEDS UPDATE

**Status:** Exists but needs modernization

**Endpoints Required:**
- **GET /api/creator/earnings** - Get creator's earnings
  - Auth: RequireAuth
  - Returns: `{ pendingEth, totalEarnedEth, payoutMethod }`
  - DB: Queries `creator_earnings` table

- **POST /api/creator/payout-method** - Set payout method
  - Auth: RequireAuth
  - Body: `{ method: "bank"|"crypto"|"stripe", payoutAddress }`
  - Calls: `setPayoutMethod()` contract function
  - DB: Saves to `creator_payout_methods` table

- **POST /api/creator/payouts/claim** - Claim earnings
  - Auth: RequireAuth
  - Body: `{ method }`
  - Validates: Payout method configured and verified
  - Calls: `claimCreatorPayout()` contract function
  - DB: Saves to `creator_payouts` table
  - Returns: Payout amount + transaction hash

- **GET /api/creator/payouts/history** - Get payout history
  - Auth: RequireAuth
  - Query: `limit`, `offset`
  - Returns: List of past payouts with pagination

- **GET /api/creator/dashboard** - Dashboard summary
  - Auth: RequireAuth
  - Returns: Earnings + products + recent sales + auctions

**Key Features:**
- Real-time earnings calculation
- Multiple payout methods
- Auto-calculation of royalties
- Complete tx history

---

### 5. Royalties Routes (server/routes/royalties.js) - NEW FILE

**Status:** Needs creation

**Endpoints Needed:**
- **GET /api/royalties/:tokenId** - Get royalty config
  - Returns: Creator address + royalty percentage

- **POST /api/royalties/:tokenId/record** - Record secondary sale
  - Body: `{ collectionAddress, salePrice, marketplace }`
  - Calls: `recordRoyaltyPayment()` contract function
  - DB: Saves to `royalty_records` table
  - Integrates: OpenSea, Blur, other marketplaces

- **POST /api/royalties/claim** - Claim royalties
  - Auth: RequireAuth
  - Body: `{ tokenAddress }`
  - Calls: `claimRoyalties()` contract function
  - Returns: Claimed amount + transaction hash

- **GET /api/royalties/history** - Get royalty history
  - Auth: RequireAuth
  - Returns: List of all royalty payments received

**Key Features:**
- Marketplace integration (OpenSea, Blur, etc.)
- Automatic royalty tracking
- Creator claim functionality
- Complete history

---

## Database Schema

### Required Tables

#### products
```sql
CREATE TABLE products (
  id BIGINT PRIMARY KEY DEFAULT SEQUENCE,
  product_id BIGINT UNIQUE NOT NULL,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50),
  supply INT NOT NULL,
  price_eth DECIMAL(20,8),
  royalty_bps INT,
  metadata_uri TEXT,
  transaction_hash VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### purchases
```sql
CREATE TABLE purchases (
  id BIGINT PRIMARY KEY DEFAULT SEQUENCE,
  product_id BIGINT NOT NULL REFERENCES products(product_id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  quantity INT NOT NULL,
  price_eth DECIMAL(20,8),
  payment_method VARCHAR(20),
  token_ids BIGINT[] DEFAULT ARRAY[]::BIGINT[],
  transaction_hash VARCHAR(255),
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT now()
);
```

#### auctions
```sql
CREATE TABLE auctions (
  id BIGINT PRIMARY KEY DEFAULT SEQUENCE,
  auction_id BIGINT UNIQUE NOT NULL,
  product_id BIGINT NOT NULL REFERENCES products(product_id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  start_price_eth DECIMAL(20,8),
  min_bid_increment_eth DECIMAL(20,8),
  duration_seconds INT,
  end_time TIMESTAMP,
  transaction_hash VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now()
);
```

#### bids
```sql
CREATE TABLE bids (
  id BIGINT PRIMARY KEY DEFAULT SEQUENCE,
  auction_id BIGINT NOT NULL REFERENCES auctions(auction_id),
  bidder_id UUID NOT NULL REFERENCES profiles(id),
  amount_eth DECIMAL(20,8),
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);
```

#### gifts
```sql
CREATE TABLE gifts (
  id BIGINT PRIMARY KEY DEFAULT SEQUENCE,
  gift_id BIGINT UNIQUE NOT NULL,
  product_id BIGINT NOT NULL REFERENCES products(product_id),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  recipient_email TEXT,
  recipient_name TEXT,
  claim_token_hash VARCHAR(255),
  message TEXT,
  transaction_hash VARCHAR(255),
  claim_transaction_hash VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);
```

#### creator_earnings
```sql
CREATE TABLE creator_earnings (
  id BIGINT PRIMARY KEY DEFAULT SEQUENCE,
  creator_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  pending_eth DECIMAL(20,8) DEFAULT 0,
  total_earned_eth DECIMAL(20,8) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT now()
);
```

#### creator_payouts
```sql
CREATE TABLE creator_payouts (
  id BIGINT PRIMARY KEY DEFAULT SEQUENCE,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  method VARCHAR(50),
  amount_eth DECIMAL(20,8),
  claim_amount_eth DECIMAL(20,8),
  transaction_hash VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);
```

#### creator_payout_methods
```sql
CREATE TABLE creator_payout_methods (
  id BIGINT PRIMARY KEY DEFAULT SEQUENCE,
  creator_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  method VARCHAR(50),
  payout_address TEXT,
  verified BOOLEAN DEFAULT false,
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);
```

#### royalty_records
```sql
CREATE TABLE royalty_records (
  id BIGINT PRIMARY KEY DEFAULT SEQUENCE,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  collection_address VARCHAR(255),
  token_id BIGINT,
  sale_price_eth DECIMAL(20,8),
  marketplace VARCHAR(50),
  royalty_amount_eth DECIMAL(20,8),
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Error Handling Middleware

**Required:** `server/middleware/errors.js`

```javascript
export const errorHandler = (fn) => (req, res) => 
  Promise.resolve(fn(req, res)).catch(error => {
    console.error(error);
    res.status(error.status || 500).json({
      error: error.message,
      code: error.code
    });
  });
```

---

## Implementation Checklist

### Products Routes
- [x] Validation schemas with Zod
- [x] Create product endpoint
- [x] List products endpoint
- [x] Get product details endpoint
- [x] Purchase estimate endpoint
- [x] Purchase product endpoint
- [x] Create auction endpoint
- [x] Place bid endpoint
- [x] Get auction details endpoint
- [x] Get bid history endpoint

### Gifts Routes
- [ ] Update to ES6 imports
- [ ] Implement create gift endpoint
- [ ] Implement claim gift endpoint
- [ ] Implement get pending gifts endpoint
- [ ] Email integration (claim links)
- [ ] Token-based security

### Creator Routes
- [ ] Update to ES6 imports
- [ ] Implement earnings endpoint
- [ ] Implement payout method endpoint
- [ ] Implement claim payout endpoint
- [ ] Implement payout history endpoint
- [ ] Implement dashboard endpoint
- [ ] Integration with creator_earnings table

### Royalties Routes
- [ ] Create new routes file
- [ ] Implement get royalty config endpoint
- [ ] Implement record royalty payment endpoint
- [ ] Implement claim royalties endpoint
- [ ] Implement royalty history endpoint
- [ ] Marketplace API integrations

### Database
- [ ] Create all required tables
- [ ] Add indexes on foreign keys
- [ ] Set up Row Level Security (RLS) policies
- [ ] Add computed/materialized views for aggregations

### Testing
- [ ] Unit tests for contract integration
- [ ] Integration tests for all endpoints
- [ ] Gas estimation accuracy tests
- [ ] Transaction receipt parsing tests
- [ ] Error scenario tests

---

## Integration Testing Procedure

### 1. Local Hardhat Testing
```bash
npm run test:contracts
npm run test:backend
```

### 2. Sepolia Testnet
```bash
# Deploy contracts
npx hardhat run scripts/deploy.js --network sepolia

# Test endpoints against testnet
npm run test:integration:sepolia
```

### 3. Staging Environment
```bash
# Full E2E test with frontend + backend + blockchain
npm run test:e2e
```

---

## Key Implementation Patterns

### 1. Contract Call Pattern
```javascript
try {
  const blockchainResult = await createProduct({ /* data */ });
  
  const { data, error } = await supabase
    .from('products')
    .insert({ product_id: blockchainResult.productId, ... });
  
  res.json({ success: true, ...blockchainResult });
} catch (error) {
  console.error("❌ Error:", error);
  throw error;
}
```

### 2. Validation Pattern
```javascript
const validation = CreateProductSchema.safeParse(req.body);
if (!validation.success) {
  return res.status(400).json({ error: validation.error.errors });
}
const { name, description, ... } = validation.data;
```

### 3. Auth Pattern
```javascript
router.post("/", requireAuth, errorHandler(async (req, res) => {
  const userId = req.user.id;
  const userWallet = req.user.wallet_address;
  // Implementation...
}));
```

---

## Success Metrics

- ✅ All 34 endpoints implemented
- ✅ Comprehensive error handling
- ✅ Transaction HASH tracking
- ✅ Complete audit logs
- ✅ 95%+ test coverage
- ✅ < 100ms average response time
- ✅ Zero silent failures

---

## Next Phase: Frontend Integration (Phase 3)

Once Phase 2 is complete:
1. Create Wagmi hooks for contract interactions
2. Update product components with Web3
3. Implement auction UI with real-time updates
4. Create gift creation/claiming flows
5. Build creator dashboard
6. Deploy to Vercel + Mainnet

**Estimated Timeline:** 7-10 days
**Team:** 2-3 developers
**Priority:** HIGH

