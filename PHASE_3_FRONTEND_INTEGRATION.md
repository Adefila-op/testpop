# Phase 3 Frontend Integration Guide

## Overview

Phase 3 focuses on integrating Web3 contract interactions into the React frontend. This guide documents all hooks, components, and implementation patterns.

**DEPENDS ON:** Phase 2 Backend API (all endpoints must be working first)
**TARGET START:** April 24, 2026
**TARGET COMPLETION:** May 1, 2026 (1 week)
**STATUS:** Planning stage

---

## Architecture Overview

### Integration Flow

```
User Action (UI Component)
    ↓
Wagmi Hook (useContractWrite / useContractRead)
    ↓
Contract Call (via connected wallet)
    ↓
Transaction Confirmation
    ↓
Backend API Call (POST to save metadata)
    ↓
Database Update
    ↓
UI Update (toast notification + re-fetch data)
```

### Tech Stack

- **State Management:** Wagmi hooks + TanStack Query
- **Contract Interaction:** ethers.js + viem
- **Wallet Connection:** wagmi + Rainbow Kit
- **HTTP Client:** Fetch API (no additional deps)
- **Notifications:** Sonner or react-hot-toast
- **Styling:** Tailwind CSS + shadcn/ui
- **Forms:** React Hook Form + Zod

---

## Custom Wagmi Hooks (Phase 3.1)

### File: `src/hooks/useProductStore.ts`

**Purpose:** Handle product creation and purchases

**Hooks:**
```typescript
export function useCreateProduct() {
  return useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'createProduct',
    onSuccess(hash) {
      // Notify user success
      // Call POST /api/products to save metadata
    },
    onError(error) {
      // Show error toast
    }
  });
}

export function usePurchaseProduct() {
  return useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'purchaseProduct',
    onSuccess(hash) {
      // Call POST /api/products/:id/purchase
      // Invalidate purchases query
    }
  });
}

export function useGetPurchaseEstimate(productId: number, quantity: number) {
  return useQuery({
    queryKey: ['purchase-estimate', productId, quantity],
    queryFn: () => 
      fetch(`/api/products/${productId}/purchase-estimate?quantity=${quantity}`)
        .then(r => r.json()),
    enabled: !!productId && quantity > 0
  });
}
```

**Expected Implementation:** 400 lines

---

### File: `src/hooks/useAuctionStore.ts`

**Purpose:** Manage auction bidding and state

**Hooks:**
```typescript
export function useCreateAuction(productId: number) {
  return useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'createAuction',
    onSuccess(hash) {
      // Call POST /api/products/:id/auctions
      // Invalidate product auctions query
    }
  });
}

export function usePlaceBid(auctionId: number) {
  return useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'placeBid',
    onSuccess(hash) {
      // Call POST /api/auctions/:id/bids
      // Refetch auction details
    }
  });
}

export function useGetAuctionState(auctionId: number) {
  return useContractRead({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'getAuctionState',
    args: [auctionId],
    watch: true // Real-time updates
  });
}

export function useGetAuctionDetails(auctionId: number) {
  return useQuery({
    queryKey: ['auction', auctionId],
    queryFn: () => 
      fetch(`/api/auctions/${auctionId}`).then(r => r.json()),
    refetchInterval: 5000 // Poll every 5 seconds
  });
}

export function useBidHistory(auctionId: number) {
  return useQuery({
    queryKey: ['bid-history', auctionId],
    queryFn: () =>
      fetch(`/api/auctions/${auctionId}/bid-history`).then(r => r.json()),
    refetchInterval: 3000
  });
}
```

**Expected Implementation:** 300 lines

---

### File: `src/hooks/useGiftStore.ts`

**Purpose:** Gift creation and claiming

**Hooks:**
```typescript
export function useCreateGift(productId: number) {
  return useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'createGift',
    onSuccess(hash) {
      // Call POST /api/gifts
      // Generate and display claim link
    }
  });
}

export function useClaimGift(claimToken: string) {
  return useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: 'claimGift',
    onSuccess(hash) {
      // Call POST /api/gifts/claim
      // Navigate to success page
    }
  });
}

export function usePendingGifts() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ['pending-gifts', address],
    queryFn: () =>
      fetch(`/api/gifts/pending`)
        .then(r => r.json()),
    enabled: !!address
  });
}
```

**Expected Implementation:** 250 lines

---

### File: `src/hooks/usePayoutStore.ts`

**Purpose:** Creator earnings and payouts

**Hooks:**
```typescript
export function useGetCreatorEarnings() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ['creator-earnings', address],
    queryFn: () =>
      fetch(`/api/creator/earnings`)
        .then(r => r.json()),
    refetchInterval: 10000,
    enabled: !!address
  });
}

export function useSetPayoutMethod() {
  return useMutation({
    mutationFn: (data) =>
      fetch(`/api/creator/payout-method`, {
        method: 'POST',
        body: JSON.stringify(data)
      }).then(r => r.json()),
    onSuccess() {
      // Invalidate earnings query
      // Show success toast
    }
  });
}

export function useClaimPayout() {
  return useMutation({
    mutationFn: (method) =>
      fetch(`/api/creator/payouts/claim`, {
        method: 'POST',
        body: JSON.stringify({ method })
      }).then(r => r.json()),
    onSuccess() {
      // Refetch earnings
      // Show success notification
    }
  });
}

export function usePayoutHistory() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ['payout-history', address],
    queryFn: () =>
      fetch(`/api/creator/payouts/history`)
        .then(r => r.json()),
    enabled: !!address
  });
}
```

**Expected Implementation:** 250 lines

---

## Component Updates (Phase 3.2)

### Updated: `src/components/ProductCard.tsx`

**Changes:**
- Add purchase button with modal
- Show price + gas estimate
- Loading states during transaction
- Error handling and retry logic

**New Code:**
```typescript
import { usePurchaseProduct, useGetPurchaseEstimate } from '@/hooks/useProductStore';
import { PurchaseModal } from './modals/PurchaseModal';

export function ProductCard({ product }) {
  const [showPurchase, setShowPurchase] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { data: estimate } = useGetPurchaseEstimate(product.product_id, quantity);
  const { write, isLoading } = usePurchaseProduct();

  const handlePurchase = async () => {
    write?.({
      args: [product.product_id, quantity]
    });
  };

  return (
    <div>
      {/* Card UI */}
      <Button 
        onClick={() => setShowPurchase(true)}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Buy Now'}
      </Button>
      
      <PurchaseModal 
        open={showPurchase}
        onOpenChange={setShowPurchase}
        estimate={estimate}
        onPurchase={handlePurchase}
      />
    </div>
  );
}
```

---

### Updated: `src/components/ItemDetailModal.tsx`

**Changes:**
- Show purchase + auction options
- Real-time price updates
- Creator details + royalty info
- Purchase/auction/share buttons

---

### Updated: `src/components/CreateCampaignDialog.tsx`

**Changes:**
- Wire to `useCreateProduct` hook
- Form validation with Zod
- Metadata upload handling
- Transaction confirmation flow

---

### Updated: `src/components/ShoppingCart.tsx`

**Changes:**
- Real-time price updates from contracts
- Gas estimation for bulk purchases
- Batch purchase handling
- Order summary with breakdown

---

## New Components (Phase 3.3)

### Auction Components

**File:** `src/components/auction/AuctionLeaderboard.tsx` (200 lines)
- Display top bids
- Bidder avatars + names
- Bid amounts formatted as ETH
- Real-time updates

**File:** `src/components/auction/BidPlacementWidget.tsx` (300 lines)
- Bid input form
- Min increment calculation + display
- Gas estimate
- Transaction confirmation
- Loading + error states

**File:** `src/components/auction/AuctionTimer.tsx` (150 lines)
- Countdown timer
- Time remaining display
- Auto-refresh on update
- Warning when < 10 min

**File:** `src/components/auction/BidHistoryList.tsx` (200 lines)
- Chronological bid history
- Bidder info + bid amounts
- Timestamp display
- Pagination for large auctions

### Gift Components

**File:** `src/components/gift/GiftDialog.tsx` (300 lines)
- Product selector
- Recipient email input
- Personal message
- Send button + confirmation

**File:** `src/components/gift/GiftClaimPage.tsx` (250 lines)
- QR code / link display
- Claim button
- Recipient email input
- Success confirmation

**File:** `src/components/gift/GiftInbox.tsx` (200 lines)
- List of pending gifts
- Gift details card
- Claim button
- Notification badge

---

## New Pages (Phase 3.4)

### Files: `src/pages/creator/`

**EarningsPage.tsx** (250 lines)
- Display pending + total earnings
- Real-time updates
- Claim earnings button
- Breakdown by product

**PayoutSettings.tsx** (300 lines)
- Payout method selector
- Address input
- Verification flow
- Connected wallet info

**PayoutHistory.tsx** (200 lines)
- Table of past payouts
- Filters + sorting
- Transaction links
- CSV export

**RoyaltyDashboard.tsx** (300 lines)
- Secondary market earnings
- Marketplace integration status
- Claim royalties button
- Attribution breakdown

---

## State Management Pattern

### Using Wagmi + TanStack Query

```typescript
// Queries (read data)
const { data: product } = useQuery({
  queryKey: ['product', id],
  queryFn: async () => {
    const res = await fetch(`/api/products/${id}`);
    return res.json();
  }
});

// Contract Writes (state-changing tx)
const { write, isLoading, data, isError } = useContractWrite({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'functionName',
  onSuccess(hash) {
    // Wait for confirmation
    // Call API to save metadata
    // Invalidate queries
  }
});

// Mutations (API calls)
const { mutate: claim } = useMutation({
  mutationFn: async (data) => {
    const res = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  onSuccess() {
    // Refetch data
    // Show notification
  }
});
```

---

## Testing Strategy

### Unit Tests
- Hook contracts parsing
- Price formatting
- Gas estimation calculations

### Integration Tests
- Contract write flows
- Metadata persistence
- Transaction confirmation
- Error recovery

### E2E Tests
- Complete product purchase flow
- Auction bid + auto-extension
- Gift creation + claiming
- Creator payout

---

## Success Metrics

- ◇ All hooks implemented (400 lines)
- ◇ All components updated (800 lines)
- ◇ All pages created (1000 lines)
- ◇ Zero wallet connection errors
- ◇ < 50ms hook response time
- ◇ 100% transaction confirmation tracking
- ◇ Real-time UI updates (< 3 sec delay)

---

## Integration Checklist

### Pre-Integration
- [ ] Phase 2 backend fully tested
- [ ] All contract ABIs available
- [ ] Wagmi configured with connectors
- [ ] TanStack Query set up
- [ ] Environment variables configured

### Hooks Implementation
- [ ] useProductStore (400 lines)
- [ ] useAuctionStore (300 lines)
- [ ] useGiftStore (250 lines)
- [ ] usePayoutStore (250 lines)
- [ ] Custom error handling hook
- [ ] Transaction confirmation hook

### Component Updates
- [ ] ProductCard.tsx
- [ ] ItemDetailModal.tsx
- [ ] CreateCampaignDialog.tsx
- [ ] ShoppingCart.tsx

### New Components
- [ ] AuctionLeaderboard
- [ ] BidPlacementWidget
- [ ] AuctionTimer
- [ ] BidHistoryList
- [ ] GiftDialog
- [ ] GiftClaimPage
- [ ] GiftInbox

### New Pages
- [ ] EarningsPage
- [ ] PayoutSettings
- [ ] PayoutHistory
- [ ] RoyaltyDashboard

### Testing
- [ ] Unit tests for hooks
- [ ] Integration tests
- [ ] E2E tests
- [ ] Gas estimation accuracy
- [ ] Error scenario coverage

### Deployment
- [ ] Frontend environment variables
- [ ] Contract addresses updated
- [ ] Backend endpoints accessible
- [ ] Sentry error tracking
- [ ] Analytics integration

---

## Timeline

**Week 1: Phase 3 (May 1-5)**
- Mon: Wagmi hooks implementation (days 1-2)
- Wed: Component updates (days 3-4)
- Fri: Testing + deployment (day 5)

**Week 2: Beta Testing**
- Internal team testing
- Bug fixes
- Performance optimization

**Week 3: Public Launch**
- Mainnet deployment
- Monitor + support

---

## Performance Optimizations

1. **Query Caching:** 5-10 second refetch intervals
2. **Lazy Loading:** Code-split page components
3. **Debouncing:** Form inputs (300ms)
4. **Memoization:** ProductCard render optimization
5. **Polling Strategy:** Exponential backoff for transaction confirmation

---

## Next: Production Deployment

Once Phase 3 is complete:
1. Migrate contracts to mainnet
2. Deploy backend to production
3. Deploy frontend to Vercel
4. Monitor performance + errors
5. Gather user feedback
6. Iterate on UX

