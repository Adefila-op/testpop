# Quick Reference - Smart Contract Interface

**Last Updated:** April 15, 2026  
**Version:** 1.0  

---

## 🔗 Contract Addresses (After Deployment)

```
PopupProductStore:     0x_________________ (Mainnet)
                       0x_________________ (Sepolia)

PopupPayoutDistributor: 0x_________________ (Mainnet)
                        0x_________________ (Sepolia)

PopupAuctionManager:    0x_________________ (Mainnet)
                        0x_________________ (Sepolia)

PopupRoyaltyManager:    0x_________________ (Mainnet)
                        0x_________________ (Sepolia)
```

---

## 📋 Core Function Reference

### 🛍️ Product Purchasing

**Frontend:**
```javascript
import { useContractWrite } from 'wagmi';

function BuyProductButton() {
  const { write: purchase } = useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'purchaseProduct',
  });

  return (
    <button onClick={() => purchase({
      args: [productId, quantity, PaymentMethod.ETH],
      value: pricePerUnit * quantity
    })}>
      Buy Now
    </button>
  );
}
```

**Backend:**
```javascript
POST /api/products/:id/purchase
Body: { quantity: 1, paymentMethod: "ETH" }
Response: { transactionHash, nftId }
```

**Smart Contract:**
```solidity
function purchaseProduct(
    uint256 productId,
    uint256 quantity,
    PaymentMethod paymentMethod
) external payable returns (uint256[] memory tokenIds)
```

---

### 🏁 Auction Bidding

**Frontend:**
```javascript
const { write: bid } = useContractWrite({
  address: PRODUCT_STORE_ADDRESS,
  abi: ProductStoreABI,
  functionName: 'placeBid',
});

<button onClick={() => bid({ 
  args: [auctionId, bidAmount], 
  value: bidAmount 
})}>
  Place Bid
</button>
```

**Backend:**
```javascript
POST /api/auctions/:id/bid
Body: { amount: "5000000000000000000" } // wei
Response: { 
  transactionHash, 
  bidAmount, 
  newEndTime 
}
```

**Smart Contract:**
```solidity
function placeBid(uint256 auctionId, uint256 amount) 
    external payable returns (bool)
```

---

### 🎁 Gift Creation

**Frontend:**
```javascript
const { write: gift } = useContractWrite({
  address: PRODUCT_STORE_ADDRESS,
  abi: ProductStoreABI,
  functionName: 'createGift',
});

<button onClick={() => gift({
  args: [productId, recipientEmail, message]
})}>
  Send as Gift
</button>
```

**Backend:**
```javascript
POST /api/gifts/create
Body: { 
  productId: 1, 
  recipientEmail: "user@example.com",
  recipientMessage: "Happy Birthday!"
}
Response: { 
  giftId, 
  claimUrl: "https://popup.app/gifts/{id}/claim"
}
```

**Smart Contract:**
```solidity
function createGift(
    uint256 productId,
    string memory recipientEmail,
    string memory message
) external returns (uint256 giftId)

function claimGift(uint256 giftId) 
    external returns (uint256 tokenId)
```

---

### 💰 Creator Payouts

**Frontend:**
```javascript
const { data: pending } = useContractRead({
  address: PAYOUT_DISTRIBUTOR_ADDRESS,
  abi: PayoutDistributorABI,
  functionName: 'getCreatorEscrow',
  args: [walletAddress]
});

const { write: claim } = useContractWrite({
  address: PAYOUT_DISTRIBUTOR_ADDRESS,
  abi: PayoutDistributorABI,
  functionName: 'retrieveEscrowPayout',
});

<button onClick={() => claim({ args: [PayoutMethod.ETH] })}>
  Claim {pending} USDC
</button>
```

**Backend:**
```javascript
POST /api/creator/payouts/claim
Body: { paymentMethod: "ETH" }
Response: { 
  claimedAmount: "1000000000000000000",
  transactionHash
}
```

**Smart Contract:**
```solidity
function setPayoutMethod(
    PayoutMethod method,
    address payoutAddress
) external

function retrieveEscrowPayout(PaymentToken token) 
    external nonReentrant
```

---

### 👑 Secondary Royalties

**Marketplace Integration:**
```javascript
// OpenSea/Blur calls this endpoint
POST /api/royalties/record
Body: {
  nftContract: "0x...",
  tokenId: 123,
  salePrice: "10000000000000000000", // wei
  marketplaceId: "opensea"
}
```

**Smart Contract:**
```solidity
function recordRoyaltyPayment(
    address nftContract,
    uint256 tokenId,
    uint256 salePrice,
    string memory marketplaceId
) external payable

function claimRoyalties(PaymentToken token) 
    external nonReentrant
```

---

## 🔑 Admin Functions

### Creator Approval

```solidity
// ProductStore only
function approveCreator(address creator) 
    external onlyOwner

function unapproveCreator(address creator) 
    external onlyOwner
```

### Platform Settings

```solidity
// PayoutDistributor
function setPlatformCommission(uint256 bps) 
    external onlyOwner
    
function setPlatformFeeRecipient(address recipient) 
    external onlyOwner

// AuctionManager
function setPlatformIncentiveShare(uint256 bps) 
    external onlyOwner

// RoyaltyManager
function setPlatformRoyaltyShare(uint256 bps) 
    external onlyOwner
    
function authorizeMarketplace(string memory id, bool authorized)
    external onlyOwner
```

### Contract Authorization

```solidity
// All contracts
function authorizeCaller(address caller) 
    external onlyOwner

function revokeCaller(address caller) 
    external onlyOwner
```

---

## 📊 View Functions (Read-Only, No Gas)

### Product Store

```solidity
function getProduct(uint256 productId) 
    external view returns (Product memory)

function getAuctionState(uint256 auctionId) 
    external view returns (AuctionState memory)

function getNFTOwner(uint256 tokenId) 
    external view returns (address)

function isCreatorApproved(address creator) 
    external view returns (bool)
```

### Payout Distributor

```solidity
function getCreatorEscrow(address creator) 
    external view returns (uint256)

function getPayoutRecord(uint256 recordId) 
    external view returns (PayoutRecord memory)

function getCollaborators(address creator) 
    external view returns (address[] memory)
```

### Auction Manager

```solidity
function getBidHistory(uint256 auctionId) 
    external view returns (BidRecord[] memory)

function getHighestBid(uint256 auctionId) 
    external view returns (address bidder, uint256 amount)

function getBidCount(uint256 auctionId) 
    external view returns (uint256)

function getAuctionStatus(uint256 auctionId) 
    external view returns (AuctionStatus)
```

### Royalty Manager

```solidity
function getRoyaltyConfig(address nftContract, uint256 tokenId) 
    external view returns (RoyaltyConfig memory)

function getPendingRoyalties(address creator) 
    external view returns (uint256)

function getTotalRoyalties(address creator) 
    external view returns (uint256)

function getRoyaltyHistory(address creator) 
    external view returns (RoyaltyPayment[] memory)
```

---

## 🪙 Payment Methods Enum

```solidity
enum PaymentMethod {
    ETH = 0,
    USDC = 1,
    USDT = 2
}

enum PaymentToken {
    ETH = 0,
    USDC = 1,
    USDT = 2
}

enum PayoutMethod {
    ETH = 0,
    USDC = 1,
    USDT = 2,
    ESCROW = 3
}
```

---

## 📡 Events to Listen For

### Critical Events (Monitor Off-Chain)

```solidity
// New product created - Index it
event ProductCreated(uint256 indexed productId, address indexed creator);

// NFT transferred - Update user wallet
event ProductPurchased(uint256 indexed productId, address indexed buyer, uint256[] tokenIds);

// Auction settled - Send winner email
event AuctionSettled(uint256 indexed auctionId, address winner, uint256 finalPrice);

// Gift created - Send email to recipient
event GiftCreated(uint256 indexed giftId, string recipientEmail);

// Gift claimed - Award rebate to sender
event GiftClaimed(uint256 indexed giftId, address indexed recipient);

// Payout made - Update creator earnings
event PayoutDistributed(uint256 indexed payoutId, address indexed creator, uint256 amount);

// Royalty paid - Update secondary earnings
event RoyaltyPaid(address indexed creator, uint256 amount, uint256 indexed tokenId, string marketplace);
```

---

## 🚨 Error Codes

```solidity
// Common errors
"Contract paused" - Emergency pause is active
"Not authorized" - Caller not in authorized list
"Invalid creator" - Creator address is zero
"No active auctions" - Auction doesn't exist
"Bid too low" - Bid doesn't meet minimum increment
"Already settled" - Auction already concluded
"No pending royalties" - Creator has no royalties to claim
"Insufficient value" - Not enough ETH sent
"Creator not approved" - Creator address not whitelisted
```

---

## ⛽ Gas Estimation

**Use for transaction preview:**

```javascript
const estimate = await productStore.estimateGas.purchaseProduct(
  productId,
  quantity,
  paymentMethod
);

const gasPrice = await provider.getGasPrice();
const costInEth = ethers.utils.formatEther(estimate.mul(gasPrice));
```

---

## 🔄 Transaction Confirmation

**Wait for confirmation:**

```javascript
const receipt = await tx.wait(
  confirmations = 1 // 1 for Mainnet, 0 for L2
);

const success = receipt.status === 1;
```

---

## 📝 Common Integration Patterns

### Pattern 1: Create & Verify

```javascript
// Create product
const tx = await productStore.createProduct(...);
const receipt = await tx.wait();

// Extract product ID from event
const event = receipt.events.find(e => e.event === 'ProductCreated');
const productId = event.args.productId;

// Store in DB
await db.products.insert({ id: productId, ... });
```

### Pattern 2: Purchase & Gift

```javascript
// Purchase product
const tx = await productStore.purchaseProduct(productId, 1, PaymentMethod.ETH, { value });
const receipt = await tx.wait();

// Extract NFT ID
const purchaseEvent = receipt.events.find(e => e.event === 'ProductPurchased');
const nftId = purchaseEvent.args.tokenIds[0];

// Transfer as gift
const giftTx = await productStore.giftNFT(nftId, recipient);
```

### Pattern 3: Auction Settlement

```javascript
// Track auction until end time
const endTime = await auction.endTime;
await sleep((endTime - now()) * 1000);

// Settle auction
const settleTx = await productStore.settleAuction(auctionId);
const receipt = await settleTx.wait();

// Send winner notification
const settlementEvent = receipt.events.find(e => e.event === 'AuctionSettled');
const winner = settlementEvent.args.winner;
await sendEmail(winner, "You won!");
```

---

## 🎯 Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Not authorized" | Unauthorized caller | Call `authorizeCaller()` |
| "Creator not approved" | Creator not whitelisted | Call `approveCreator()` |
| "Contract paused" | Emergency pause active | Call `unpause()` |
| "Insufficient value" | Not enough ETH sent | Increase `value` parameter |
| "Bid too low" | Below minimum increment | Calculate minimum first |
| "No pending royalties" | Creator has no earnings | Wait for sales |

---

## 📚 Related Documentation

- Full Deployment Guide: `SMART_CONTRACTS_DEPLOYMENT_GUIDE.md`
- Technical Deep Dive: `COMPLETE_SMART_CONTRACTS_SUMMARY.md`
- Contract Repository: `contracts/` directory

---

*This is a quick reference. For detailed information, see full documentation.*
