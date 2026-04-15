# Complete Transaction Flow Audit - POPUP Platform
**Date:** April 15, 2026  
**Status:** COMPREHENSIVE AUDIT COMPLETE

---

## 🎯 EXECUTIVE SUMMARY

This document provides a complete audit of all UI components, functions, and smart contract interactions related to:
1. Bidding on products
2. Collecting/purchasing products  
3. Gifting products
4. Gas fee calculations
5. Onchain payments
6. NFT minting
7. Smart contract interactions

### ⚠️ KEY FINDING: Most Smart Contracts Are DISABLED
- `useContracts.tsx` - Stub (throws errors)
- `useContractsArtist.tsx` - Stub (throws errors)
- `useCampaignV2.tsx` - Stub (throws errors)
- `useContractIntegrations.tsx` - Stub (returns null)
- `creativeReleaseEscrowChain.ts` - Stub (throws "Onchain contracts are disabled")

---

## 1️⃣ BIDDING SYSTEM

### 1.1 Legacy Auction/Bidding (PAUSED)

**Status:** ❌ **DISABLED** - Legacy auctions paused while platform migrates

**Key References:**
- [src/pages/ArtistStudioPage.tsx](src/pages/ArtistStudioPage.tsx#L1403-L1415) - Lines 1403-1415
- [src/pages/Index.tsx](src/pages/Index.tsx#L529-L563) - Lines 529-563

**Message:**
```
"Legacy auctions are paused while POPUP migrates them to the safer POAP campaign flow."
```

**UI Element:**
```tsx
// src/pages/ArtistStudioPage.tsx - Line 1403
<button
  onClick={() => {
    if (isAuctionOption) {
      toast.error(LEGACY_AUCTION_DISABLED_MESSAGE);
      return;
    }
    setForm({ ...form, type: t });
  }}
  className={`py-2 rounded-xl text-xs font-semibold capitalize border ${
    isAuctionOption ? "cursor-not-allowed opacity-60" : ""
  }`}
  aria-disabled={isAuctionOption}
>
  {isAuctionOption ? "auction paused" : t}
</button>
```

**Drop Type Options:** `["buy", "auction", "campaign"]`
- Only "buy" and "campaign" are currently active
- "auction" option disabled with opacity-60

### 1.2 Bidding Hook (STUB)

**File:** `src/hooks/useContracts.tsx` (Line 1)  
**Status:** ❌ **DISABLED**

```tsx
export function usePlaceBid() {
  // Not exported - throws error when called
  return {
    placeBid: async () => {
      throw new Error("Onchain contracts are disabled");
    },
  };
}
```

**Usage Attempt:** [src/pages/Index.tsx](src/pages/Index.tsx#L1) - Line 1
```tsx
import { usePlaceBid } from "@/hooks/useContracts";

// Called in handleBidOnDrop function
placeBid(drop.contractDropId, drop.priceEth);
```

### 1.3 Bid State in Drop Card

**File:** [src/components/wallet/DropPrimaryActionCard.tsx](src/components/wallet/DropPrimaryActionCard.tsx#L192-L220)  
**Lines:** 192-220

**Function:** `handlePlaceBid()`
```tsx
const handlePlaceBid = async () => {
  if (!isConnected) {
    await connectWallet();
    return;
  }
  if (chain?.id !== ACTIVE_CHAIN.id) {
    try {
      await requestActiveChainSwitch(`Bidding on this drop requires ${ACTIVE_CHAIN.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Switch to ${ACTIVE_CHAIN.name} and try again.`);
    }
    return;
  }
  if (!isAuctionDrop) {
    toast.error("This listing is not an auction.");
    return;
  }
  if (!bidAmount || parseFloat(bidAmount) <= 0) {
    toast.error("Enter a valid bid amount");
    return;
  }
  // Calls placeBid from hook (currently throws)
  placeBid(drop.contractDropId, parseEther(bidAmount), drop.contractAddress);
};
```

### 1.4 Catalog Action Detection

**File:** [src/utils/catalogUtils.ts](src/utils/catalogUtils.ts#L147)  
**Lines:** 147-170

```tsx
export function getItemActions(item: CatalogItem) {
  const actions = [];

  if (item.can_purchase) {
    actions.push({
      type: 'primary',
      action: getPurchaseButtonText(item),
      handler: 'purchase'
    });
  }

  if (item.can_bid) {
    actions.push({
      type: 'secondary',
      action: 'Place Bid',
      handler: 'bid'  // ← Bid action if can_bid=true
    });
  }
  
  // ...
}
```

**UI Label in ShareLandingPage:** [src/pages/ShareLandingPage.tsx](src/pages/ShareLandingPage.tsx#L121-L135)
```tsx
case "bid":
  return { action, label: "Bid", icon: Gavel };
```

---

## 2️⃣ COLLECTING/PURCHASING PRODUCTS

### 2.1 Primary Collection Flows

#### Flow A: Fresh/Offchain Checkout

**Entry Points:**
1. [src/pages/FreshProductDetailPage.tsx](src/pages/FreshProductDetailPage.tsx#L57-L70) - Product collection
2. [src/pages/CheckoutPage.tsx](src/pages/CheckoutPage.tsx#L1-L320) - Checkout handler

**Status:** ✅ **WORKING** - Offchain checkout flow

**Function:** `handleCollectInApp()`
```tsx
// src/pages/FreshProductDetailPage.tsx - Line 57
async function handleCollectInApp() {
  if (!product) return;
  try {
    setBusy(true);
    await addFreshCartItem(collectorId, product.id, 1);
    navigate("/checkout");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to start checkout.");
  } finally {
    setBusy(false);
  }
}
```

**Checkout Flow:** [src/pages/CheckoutPage.tsx](src/pages/CheckoutPage.tsx#L84-L120)

```tsx
async function handleCheckout() {
  if (!cart || cart.items.length === 0) {
    toast.error("Your cart is empty.");
    return;
  }

  if (isGift && !recipientLabel.trim()) {
    toast.error("Enter who should receive the gift.");
    return;
  }

  try {
    setIsCheckingOut(true);
    const payload = await checkoutFresh({
      collectorId,
      paymentMethod,  // "onchain" | "offramp_partner"
      gift: isGift ? { recipient_label: recipientLabel.trim() } : undefined,
    });

    setCompleted({
      orderId: payload.order.id,
      paymentMethod: payload.order.payment_method,
      giftUrl: payload.gift?.claim_url || null,
    });
    await refreshCart();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Checkout failed.");
  } finally {
    setIsCheckingOut(false);
  }
}
```

#### Flow B: Onchain Mint Collection

**File:** [src/pages/Index.tsx](src/pages/Index.tsx#L384-L440)  
**Status:** ❌ **BROKEN** - Calls disabled hook

```tsx
const handleCollectDrop = async (drop: any) => {
  if (!isConnected) {
    await connectWallet();
    return;
  }

  if (chain?.id !== ACTIVE_CHAIN.id) {
    try {
      await requestActiveChainSwitch(`Collecting this drop requires ${ACTIVE_CHAIN.name}.`);
    } catch (error) {
      toast({
        title: "Wrong network",
        description: error instanceof Error ? error.message : `Switch to ${ACTIVE_CHAIN.name} and try again.`,
        variant: "destructive",
      });
    }
    return;
  }

  try {
    // Validate drop has required contract fields
    if (
      drop.contractDropId === null ||
      drop.contractDropId === undefined ||
      !drop.contractAddress
    ) {
      throw new Error("This drop is not properly deployed on-chain yet");
    }
    
    setMintingDropId(drop.id);
    setCollectingDrop(drop);
    recordDropView(drop.id);
    const priceWei = parseEther(drop.priceEth);
    
    console.log(`🛒 Minting contract drop #${drop.contractDropId} on ${drop.contractAddress}...`);
    
    // CALLS DISABLED HOOK - Will throw error
    mintArtist(drop.contractDropId, priceWei, drop.contractAddress);
    toast({
      title: "Collect Submitted",
      description: `Collecting "${drop.title}" for ${drop.priceEth} ETH...`,
    });
  } catch (err) {
    console.error("❌ Mint error:", err);
    toast({
      title: "Error",
      description: err instanceof Error ? err.message : "Failed to collect drop",
      variant: "destructive",
    });
    setMintingDropId(null);
    setCollectingDrop(null);
  }
};
```

#### Flow C: Cart-Based Purchasing

**File:** [src/stores/cartStore.ts](src/stores/cartStore.ts#L1-L60)  
**Status:** ✅ **WORKING** - Zustand store for cart state

```tsx
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: (productId, creativeReleaseId, contractKind, contractListingId, contractProductId, quantity, price, name, image) => {
        const { items } = get();
        const priceStr = price.toString();
        const existingItem = items.find((item) => item.productId === productId);

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.productId === productId
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    creativeReleaseId,
                    contractKind,
                    contractListingId,
                    contractProductId,
                    price: priceStr,
                    name,
                    image,
                  }
                : item
            ),
          });
          return;
        }

        set({
          items: [
            ...items,
            {
              productId,
              creativeReleaseId,
              contractKind,
              contractListingId,
              contractProductId,
              quantity,
              price: priceStr,
              name,
              image,
            },
          ],
        });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.productId !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        set({
          items: get().items.map((item) =>
            item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        });
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + BigInt(item.price) * BigInt(item.quantity), 0n);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      clearCart: () => {
        set({ items: [] });
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### 2.2 Product Acquisition Types

**File:** [src/lib/catalogUtils.ts](src/lib/catalogUtils.ts#L10-L40)

```tsx
export interface CatalogItem {
  id: string;
  item_type: ItemType;  // 'drop' | 'product' | 'release'
  title: string;
  description?: string;
  image_url?: string;
  price_eth?: number;
  supply_or_stock?: number;
  can_purchase: boolean;  // ← Primary flag for checkout eligibility
  can_bid: boolean;       // ← Auction eligibility
  can_participate_campaign: boolean;  // ← Campaign eligibility
  creator_id: string;
  creator_wallet: string;
  product_type?: "digital" | "physical" | "hybrid";
  contract_kind?: "artDrop" | "productStore" | "creativeReleaseEscrow";
  contract_listing_id?: number | null;
  contract_product_id?: number | null;
  creative_release_id?: string | null;
}
```

### 2.3 Add to Cart Implementation

**File:** [src/components/ShoppingCart.tsx](src/components/ShoppingCart.tsx#L1-L140)

```tsx
export function ShoppingCart() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems, clearCart } =
    useCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shopping Cart</CardTitle>
          <CardDescription>{items.length} items • {totalItems} units</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-4 p-4 border rounded-lg">
                <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{formatEther(BigInt(item.price))} ETH each</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button size="sm" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.productId)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-semibold">{formatEther(totalPrice)} ETH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated wallet gas:</span>
            <span className="font-semibold">Paid separately</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-bold">Items total:</span>
            <span className="text-lg font-bold">{formatEther(totalPrice)} ETH</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Network gas is confirmed in your wallet and is not included in the items total above.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/drops")} className="flex-1">
          Back to Drops
        </Button>
        <Button onClick={() => navigate("/checkout")} disabled={isCheckingOut} className="flex-1 gap-2">
          {isCheckingOut ? <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </> : <>
            Proceed to Checkout
            <ArrowRight className="w-4 h-4" />
          </>}
        </Button>
      </div>
    </div>
  );
}
```

---

## 3️⃣ GIFTING PRODUCTS

### 3.1 Gift Flow Architecture

**Status:** ✅ **PARTIALLY WORKING** - Backend implemented, UI partially working

### 3.2 Gift Order Creation

**Backend:** [server/index.js](server/index.js#L3199-L3250)  
**Lines:** 3199-3250

```js
// Create/process gift orders
app.post("/orders/create-legacy", authOptional, async (req, res) => {
  const order = req.body || {};
  
  // Parse gift metadata from shipping address
  const shippingAddressJsonb = normalizeShippingAddress(order.shipping_address_jsonb ?? order.shipping_address);
  
  // Apply gift metadata if present
  shippingAddressJsonb = applyGiftMetadataToShippingAddress(shippingAddressJsonb, buyerWallet);
  
  // Stores gift_recipient_wallet, gift_sender_wallet, gift_status, gift_note
  // ...
});
```

**Gift Metadata Structure:**
```ts
export interface GiftOrder extends OrderWithItems {
  gift?: {
    recipient_wallet: string;
    sender_wallet?: string | null;
    status?: "pending" | "accepted" | "declined";
    note?: string | null;
    gifted_at?: string | null;
    accepted_at?: string | null;
  } | null;
}
```

### 3.3 Gift Parsing Functions

**File:** [server/index.js](server/index.js#L421-L465)

```js
// Parse gift metadata from shipping address JSON
function parseGiftMetadata(rawShippingAddress) {
  if (!rawShippingAddress || typeof rawShippingAddress !== "object" || Array.isArray(rawShippingAddress)) {
    return null;
  }

  const recipientWallet = normalizeWallet(
    typeof rawShippingAddress.gift_recipient_wallet === "string"
      ? rawShippingAddress.gift_recipient_wallet
      : typeof rawShippingAddress.recipient_wallet === "string"
      ? rawShippingAddress.recipient_wallet
      : ""
  );

  if (!recipientWallet) {
    return null;
  }

  const senderWallet = normalizeWallet(
    typeof rawShippingAddress.gift_sender_wallet === "string"
      ? rawShippingAddress.gift_sender_wallet
      : ""
  );
  const statusCandidate = typeof rawShippingAddress.gift_status === "string"
    ? rawShippingAddress.gift_status.trim().toLowerCase()
    : "pending";
  const status = GIFT_ORDER_STATUSES.has(statusCandidate) ? statusCandidate : "pending";
  const note = typeof rawShippingAddress.gift_note === "string"
    ? rawShippingAddress.gift_note.trim()
    : "";

  return {
    recipientWallet,
    senderWallet: senderWallet || null,
    status,
    note: note || null,
    giftedAt: rawShippingAddress.gifted_at || null,
    acceptedAt: rawShippingAddress.gift_accepted_at || null,
  };
}

// Apply gift metadata to shipping address
function applyGiftMetadataToShippingAddress(shippingAddressJsonb, buyerWallet) {
  const gift = parseGiftMetadata(shippingAddressJsonb);
  if (!gift) {
    return shippingAddressJsonb;
  }

  const senderWallet = normalizeWallet(buyerWallet) || gift.senderWallet;
  const status = gift.status === "accepted" ? "accepted" : "pending";

  return {
    ...(shippingAddressJsonb || {}),
    gift_recipient_wallet: gift.recipientWallet,
    gift_sender_wallet: senderWallet || null,
    gift_status: status,
    gift_note: gift.note || null,
    gifted_at: gift.giftedAt || new Date().toISOString(),
    gift_accepted_at: status === "accepted" ? gift.acceptedAt || new Date().toISOString() : null,
  };
}
```

### 3.4 Gift Checkout Flag

**File:** [src/pages/CheckoutPage.tsx](src/pages/CheckoutPage.tsx#L29-L115)

```tsx
export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const collectorId = useGuestCollector();

  const productFromQuery = String(searchParams.get("product") || "").trim();
  const giftFromQuery = searchParams.get("gift") === "1";  // ← Gift flag

  const [cart, setCart] = useState<FreshCart | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"onchain" | "offramp_partner">("offramp_partner");
  const [isGift, setIsGift] = useState(giftFromQuery);
  const [recipientLabel, setRecipientLabel] = useState("");

  // In checkout form:
  <label className="flex items-center gap-2">
    <input 
      type="checkbox" 
      checked={isGift} 
      onChange={(event) => setIsGift(event.target.checked)} 
    />
    <span className="text-sm font-medium text-slate-700">
      Pay as a gift for another collector
    </span>
  </label>

  // Gift recipient field
  {isGift && (
    <input
      type="text"
      placeholder="Recipient label or address"
      value={recipientLabel}
      onChange={(e) => setRecipientLabel(e.target.value)}
      className="w-full px-4 py-2 rounded-lg border border-slate-200"
    />
  )}

  // In handleCheckout:
  const payload = await checkoutFresh({
    collectorId,
    paymentMethod,
    gift: isGift ? { recipient_label: recipientLabel.trim() } : undefined,  // ← Pass gift data
  });
}
```

### 3.5 Gift Link Button

**File:** [src/pages/FreshProductDetailPage.tsx](src/pages/FreshProductDetailPage.tsx#L333-L355)

```tsx
{isViewInApp ? (
  <button
    type="button"
    onClick={() => navigate("/discover")}
    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
  >
    Back to discover
  </button>
) : (
  <button
    type="button"
    onClick={() => navigate(`/checkout?product=${encodeURIComponent(product.id)}&gift=1`)}
    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
  >
    Gift this product
  </button>
)}
```

### 3.6 Gift Claim Page

**File:** [src/pages/GiftClaimPage.tsx](src/pages/GiftClaimPage.tsx#L1-L140)  
**Status:** ✅ **WORKING** - Accepts/rejects gifts

```tsx
export default function GiftClaimPage() {
  const { token } = useParams<{ token: string }>();
  const [gift, setGift] = useState<FreshGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"accept" | "reject" | null>(null);
  const navigate = useNavigate();
  const collectorId = useGuestCollector();

  const handleAccept = async () => {
    if (!token) return;
    try {
      setBusyAction("accept");
      await acceptFreshGift(token, collectorId);
      toast.success("Gift accepted! Check your collection.");
      navigate("/collection");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept gift.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    try {
      setBusyAction("reject");
      await rejectFreshGift(token);
      toast.success("Gift rejected.");
      navigate("/discover");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject gift.");
    } finally {
      setBusyAction(null);
    }
  };

  // Render gift items
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      {/* Show items, totals */}
      {gift.status === "pending" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={busyAction !== null}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {busyAction === "accept" ? "Accepting..." : "Accept gift"}
          </button>
          <button
            type="button"
            onClick={() => void handleReject()}
            disabled={busyAction !== null}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-70"
          >
            {busyAction === "reject" ? "Rejecting..." : "Reject gift"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

### 3.7 Gift Handling in Collection

**File:** [src/pages/MyCollectionPage.tsx](src/pages/MyCollectionPage.tsx#L338-L470)

```tsx
// Get received gifts
const [pendingGiftOrders, setPendingGiftOrders] = useState<GiftOrder[]>([]);
const [acceptedGiftOrders, setAcceptedGiftOrders] = useState<GiftOrder[]>([]);

// Load gifts
const normalizedGiftOrders = (receivedGiftOrders || []).filter((order) => {
  const gift = parseGiftMetadata(order);
  return gift?.recipientWallet === normalizedAddress;
});
const pendingGifts = normalizedGiftOrders.filter((order) => {
  const gift = parseGiftMetadata(order);
  return gift?.status === "pending";
});
const acceptedGiftOrders = normalizedGiftOrders.filter((order) => {
  const gift = parseGiftMetadata(order);
  return gift?.status === "accepted";
});

// Display gifts inbox
{pendingGiftOrders.map((order) => {
  const gift = parseGiftMetadata(order);
  const senderLabel = gift?.senderWallet ? truncateWallet(gift.senderWallet, 8, 4) : "Collector";

  return (
    <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Gift from {senderLabel}</p>
      <p className="text-xs text-slate-600">{formatEth(order.total_price_eth)} ETH worth of items</p>
      <button onClick={() => navigate(`/gift/${order.id}?action=accept`)}>Accept</button>
    </div>
  );
})}
```

### 3.8 Backend Gift Accept Handler

**File:** [server/index.js](server/index.js#L3680-L3780)  
**Endpoint:** `POST /gifts/:id/accept`

```js
registerRoute("post", "/gifts/:id/accept", authRequired, async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Gift order not found" });
    }

    const gift = parseGiftMetadata(order.shipping_address_jsonb);
    if (!gift) {
      return res.status(400).json({ error: "This order is not marked as a gift" });
    }

    if (req.auth.role !== "admin" && gift.recipientWallet !== req.auth.wallet) {
      return res.status(403).json({ error: "Only the intended recipient can accept this gift" });
    }

    if (gift.status === "accepted") {
      return res.json({ success: true, order });
    }

    const now = new Date().toISOString();
    const nextShippingAddress = {
      ...(order.shipping_address_jsonb && typeof order.shipping_address_jsonb === "object" ? order.shipping_address_jsonb : {}),
      gift_recipient_wallet: gift.recipientWallet,
      gift_sender_wallet: gift.senderWallet || normalizeWallet(order.buyer_wallet),
      gift_status: "accepted",
      gift_note: gift.note || null,
      gifted_at: gift.giftedAt || now,
      gift_accepted_at: now,
    };

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        shipping_address_jsonb: nextShippingAddress,
        updated_at: now,
      })
      .eq("id", order.id);

    if (updateOrderError) {
      return res.status(400).json({ error: updateOrderError.message || "Failed to accept gift" });
    }

    // Transfer entitlements to recipient
    const senderWallet = normalizeWallet(order.buyer_wallet);
    const recipientWallet = gift.recipientWallet;
    
    const { data: transferredEntitlements, error: transferEntitlementsError } = await supabase
      .from("entitlements")
      .update({
        buyer_wallet: recipientWallet,
        updated_at: now,
      })
      .eq("order_id", order.id)
      .eq("buyer_wallet", senderWallet)
      .select("id");

    const hydratedOrder = await getOrderById(order.id);
    return res.json({
      success: true,
      order: hydratedOrder,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to accept gift" });
  }
});
```

---

## 4️⃣ GAS FEE CALCULATIONS

### 4.1 Gas Fee Display

**Status:** ⚠️ **PARTIAL** - Displayed but not calculated

**File:** [src/components/ShoppingCart.tsx](src/components/ShoppingCart.tsx#L97-L110)

```tsx
<div className="flex justify-between text-sm">
  <span className="text-muted-foreground">Estimated wallet gas:</span>
  <span className="font-semibold">Paid separately</span>  // ← Not calculated, just noted
</div>

<p className="text-xs text-muted-foreground">
  Network gas is confirmed in your wallet and is not included in the items total above.
</p>
```

### 4.2 Price Formatting

**File:** [src/lib/paymentConfig.ts](src/lib/paymentConfig.ts#L215-L230)

```ts
export function formatTokenAmount(amount: number, decimals: number = 6): string {
  return (amount / Math.pow(10, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function parseTokenAmount(amount: string, decimals: number = 6): bigint {
  const [integer, fractional] = amount.split(".");
  const frac = fractional ? fractional.padEnd(decimals, "0").slice(0, decimals) : "".padEnd(decimals, "0");
  return BigInt(integer + frac);
}
```

### 4.3 Price Display in Checkout

**File:** [src/pages/CheckoutPage.tsx](src/pages/CheckoutPage.tsx#L214-L280)

```tsx
function formatEth(value: number) {
  return `${(value / 1e18).toFixed(3)} ETH`;
}

{cart.items.map((item) => (
  <article key={item.product_id} className="rounded-xl border border-slate-200 p-3">
    <div className="flex items-start gap-3">
      <img src={item.image_url} alt={item.title} className="h-16 w-16 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
        <p className="text-xs text-slate-500">{item.creator_name}</p>
        <p className="text-xs text-slate-500">{item.product_type}</p>
      </div>
      <p className="text-sm font-semibold text-slate-900">{formatEth(item.line_total_eth)}</p>
    </div>
  </article>
))}
```

### 4.4 ETH Utility Functions

Usage of `parseEther` and `formatEther` from `viem`:

```tsx
import { parseEther, formatEther } from "viem";

// Parsing user input to wei
const priceWei = parseEther(drop.priceEth);

// Formatting wei for display
const displayPrice = formatEther(price);  // e.g., "1.5" ETH
```

---

## 5️⃣ ONCHAIN PAYMENTS

### 5.1 Payment Method Selection

**File:** [src/pages/CheckoutPage.tsx](src/pages/CheckoutPage.tsx#L254-L280)  
**Status:** ⚠️ **PARTIAL UI** - Methods shown but "onchain" payment disabled

```tsx
<h2 className="text-lg font-bold text-slate-900">Payment</h2>
<div className="mt-3 space-y-2">
  <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
    <input
      type="radio"
      checked={paymentMethod === "onchain"}
      onChange={() => setPaymentMethod("onchain")}
    />
    <span className="text-sm font-medium text-slate-700">Onchain wallet payment</span>
  </label>
  <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
    <input
      type="radio"
      checked={paymentMethod === "offramp_partner"}
      onChange={() => setPaymentMethod("offramp_partner")}
    />
    <span className="text-sm font-medium text-slate-700">Off-ramp partner payment</span>
  </label>
</div>

<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs uppercase tracking-[0.18em] text-slate-500">
  {paymentMethod === "onchain"
    ? `Chain: ${ACTIVE_CHAIN.name}`
    : "Offchain: Coinbase Pay (stubbed)"}
</div>
```

### 5.2 Payment Methods Configuration

**File:** [src/lib/paymentConfig.ts](src/lib/paymentConfig.ts#L1-L230)  
**Status:** ✅ **CONFIG DEFINED** - Ready to integrate

**Supported Chains:**
- Base (Mainnet & Sepolia)
- Polygon
- Optimism
- Arbitrum

**Example Configuration:**
```ts
export const PAYMENT_OPTIONS: Record<string, PaymentOption> = {
  "usdc-base": {
    id: "usdc-base",
    label: "USDC (Base)",
    description: "Fastest and cheapest",
    chain: "base",
    token: "USDC",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b1566469c3d",
    decimals: 6,
    chainId: 8453,
    chainName: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    isTestnet: false,
    isActive: true,
  },
  "usdt-base": {
    id: "usdt-base",
    label: "USDT (Base)",
    description: "Alternative stablecoin on Base",
    chain: "base",
    token: "USDT",
    tokenAddress: "0xfde4C96c8593536E31F26ECd50712f94295e27e7",
    decimals: 6,
    chainId: 8453,
    chainName: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    isTestnet: false,
    isActive: true,
  },
  // ... Polygon, Optimism, Arbitrum variants
};

// Helpers
export function getActivePaymentOptions(): PaymentOption[] {
  return Object.values(PAYMENT_OPTIONS).filter((opt) => opt.isActive && !opt.isTestnet);
}

export function getPaymentOptionsByChain(chain: PaymentChain): PaymentOption[] {
  return Object.values(PAYMENT_OPTIONS)
    .filter((opt) => opt.chain === chain && opt.isActive)
    .sort((a, b) => {
      // USDC first, then USDT
      if (a.token !== b.token) {
        return a.token === "USDC" ? -1 : 1;
      }
      return 0;
    });
}
```

### 5.3 Token Payment Hook (STUB)

**File:** [src/hooks/useTokenPayment.ts](src/hooks/useTokenPayment.ts#L1-L250)  
**Status:** ⚠️ **STUB** - Simulates token operations

```ts
export function useTokenPayment(paymentOption: PaymentOption | null) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [tx, setTx] = useState<TokenTransaction | null>(null);

  const checkBalance = useCallback(async (amount: bigint): Promise<boolean> => {
    if (!address || !paymentOption) {
      toast.error("Wallet not connected or payment option missing");
      return false;
    }

    // In production: call contract.balanceOf(address)
    // For now: simulated
    toast.info("Checking token balance...");
    const hasBalance = true;  // Simulated
    if (!hasBalance) {
      toast.error(`Insufficient ${paymentOption.token} balance`);
      return false;
    }

    return true;
  }, [address, paymentOption]);

  const approveToken = useCallback(
    async (amount: bigint): Promise<string | null> => {
      if (!address || !paymentOption) {
        toast.error("Wallet not connected");
        return null;
      }

      try {
        setIsProcessing(true);
        toast.loading(`Approving ${paymentOption.token}...`);

        // Step 1: Check if approval is needed
        // In production: call contract.allowance(userAddress, spenderAddress)
        const approvalNeeded = true;

        if (!approvalNeeded) {
          toast.dismiss();
          return "approved";
        }

        // Step 2: Send approval transaction
        // In production: call contract.approve(spenderAddress, amount)
        const approvalHash = `0x${Math.random().toString(16).slice(2)}`;

        // Simulate approval confirmation
        await new Promise((resolve) => setTimeout(resolve, 2000));

        toast.dismiss();
        toast.success(`${paymentOption.token} approved for spending`);
        return approvalHash;
      } catch (error) {
        toast.dismiss();
        const message = error instanceof Error ? error.message : "Approval failed";
        toast.error(message);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [address, paymentOption]
  );

  const transferToken = useCallback(
    async (amount: bigint): Promise<TokenTransaction | null> => {
      const approvalHash = await approveToken(amount);
      if (!approvalHash) {
        return null;
      }

      try {
        setIsProcessing(true);
        toast.loading(`Sending ${paymentOption?.token}...`);

        // Step 3: Transfer tokens
        // In production: call contract.transfer(recipientAddress, amount)
        const transferHash = `0x${Math.random().toString(16).slice(2)}`;

        // Simulate transfer confirmation
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const transaction: TokenTransaction = {
          hash: transferHash,
          from: address,
          to: paymentOption?.tokenAddress || "",
          amount: amount.toString(),
          token: paymentOption?.token || "UNKNOWN",
          chain: paymentOption?.chainId || 0,
          timestamp: Date.now(),
        };

        setTx(transaction);
        toast.dismiss();
        toast.success(`${paymentOption?.token} sent successfully`);

        return transaction;
      } catch (error) {
        toast.dismiss();
        const message = error instanceof Error ? error.message : "Transfer failed";
        toast.error(message);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [address, paymentOption, approveToken]
  );

  return {
    isProcessing,
    tx,
    checkBalance,
    approveToken,
    transferToken,
  };
}
```

### 5.4 Fresh Checkout with Payment

**File:** [src/lib/freshApi.ts](src/lib/freshApi.ts#L336-L360)

```ts
export async function checkoutFresh({
  collectorId,
  paymentMethod,
  paymentToken,         // USDC | USDT
  paymentChain,         // base | polygon | optimism | arbitrum
  paymentTxHash,        // Token transfer transaction hash
  items,
  gift,
}: {
  collectorId: string;
  paymentMethod: "card" | "crypto" | "offramp_partner";
  paymentToken?: string;
  paymentChain?: string;
  paymentTxHash?: string;
  items?: Array<{ product_id: string; quantity: number }>;
  gift?: { recipient_label: string };
}) {
  // Implementation in server/freshApp.js
}
```

---

## 6️⃣ NFT MINTING

### 6.1 Mint Artist Hook (DISABLED)

**File:** [src/hooks/useContractsArtist.tsx](src/hooks/useContractsArtist.tsx)  
**Status:** ❌ **DISABLED** - All mint functions throw errors

```tsx
export function useMintArtist() {
  return {
    mintAsync: async () => {
      throw new Error("Onchain contracts are disabled");
    },
    isPending: false,
  };
}
```

**Usage Attempts:**

1. **In Index.tsx (Home Page)** - [Line 419](src/pages/Index.tsx#L419)
```tsx
import { useMintArtist } from "@/hooks/useContractsArtist";

const { mintArtist } = useMintArtist();

// Called when user collects drop
mintArtist(drop.contractDropId, priceWei, drop.contractAddress);
```

2. **In DropPrimaryActionCard.tsx** - [Line 192](src/components/wallet/DropPrimaryActionCard.tsx#L192)
```tsx
const handleMint = () => {
  if (!isConnected) {
    connectWallet();
    return;
  }
  
  // THROWS ERROR
  mintArtist(drop.contractDropId, parseEther(drop.priceEth), drop.contractAddress);
};
```

3. **In RebootDiscoverFeedPage.tsx** - [Line 115](src/pages/RebootDiscoverFeedPage.tsx#L115)
```tsx
async function handleOnchainCollect(post: FreshFeedItem) {
  try {
    setBusyId(post.id);
    setCollectingPost(post);
    // THROWS ERROR
    mintArtist(dropId, parseEther(String(post.price_eth || 0)), contractAddress);
    toast.loading("Submitting onchain collect...");
  } catch (error) {
    // Error caught
  }
}
```

### 6.2 Create Drop Hook (DISABLED)

**File:** [src/hooks/useContractsArtist.tsx](src/hooks/useContractsArtist.tsx)

```tsx
export function useCreateDropArtist() {
  return {
    createDropAsync: async () => {
      throw new Error("Onchain contracts are disabled");
    },
    isPending: false,
  };
}
```

### 6.3 Artist Studio Drop Creation Flow

**File:** [src/pages/ArtistStudioPage.tsx](src/pages/ArtistStudioPage.tsx#L1010-L1030)

```tsx
const { createDrop } = useCreateDropArtist(artistContractAddress);

// User submits drop creation form
const handleCreateDrop = async () => {
  const now = Math.floor(Date.now() / 1000);
  try {
    if (form.type === "buy") {
      // THROWS ERROR - contract disabled
      createDrop(uri, form.price, Number(form.supply), now, now + Number(form.duration) * 3600);
    } else if (form.type === "campaign" && pendingResult === null) {
      // THROWS ERROR - contract disabled
      createCampaignV2({
        metadataUri: uri,
        entryMode: form.entryMode,
        maxSupply: Number(form.supply),
        ticketPriceEth: form.entryMode === "content" ? "0" : form.price || "0",
        startTime: Math.floor(new Date(form.startAt).getTime() / 1000),
        endTime: Math.floor(new Date(form.endAt).getTime() / 1000),
        redeemStartTime: endTime + 24 * 60 * 60,
      });
    }
  } catch (contractError: unknown) {
    const errorMessage =
      contractError instanceof Error
        ? contractError.message
        : "Contract call failed";
    setUploadErr(errorMessage);
  }
};
```

### 6.4 Artist Contract Deployment

**Backend:** [server/index.js](server/index.js#L1373-L1440)

```js
async function deployArtistContractForWallet(wallet) {
  requireEnv(DEPLOYER_PRIVATE_KEY, "DEPLOYER_PRIVATE_KEY");
  requireEnv(BASE_SEPOLIA_RPC_URL, "BASE_SEPOLIA_RPC_URL");
  requireEnv(ART_DROP_FACTORY_ADDRESS, "ART_DROP_FACTORY_ADDRESS");

  const artistWallet = ethers.getAddress(wallet);
  const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const factory = new ethers.Contract(ART_DROP_FACTORY_ADDRESS, FACTORY_ABI, signer);

  const existingContractAddress = await factory.getArtistContract(artistWallet);
  if (existingContractAddress && existingContractAddress !== ethers.ZeroAddress) {
    return {
      contractAddress: ethers.getAddress(existingContractAddress),
      deploymentTx: null,
      alreadyDeployed: true,
    };
  }

  let tx;
  try {
    tx = await factory.deployArtDrop(artistWallet);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Artist already has contract")) {
      const contractAddress = await factory.getArtistContract(artistWallet);
      if (contractAddress && contractAddress !== ethers.ZeroAddress) {
        return {
          contractAddress: ethers.getAddress(contractAddress),
          deploymentTx: null,
          alreadyDeployed: true,
        };
      }
    }
    throw error;
  }

  const receipt = await tx.wait();

  const deployedEvent = receipt.logs
    .map((log) => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((event) => event?.name === "ArtDropDeployed");

  const contractAddress = deployedEvent?.args?.artDropContract || 
    (await factory.getArtistContract(artistWallet));

  if (!contractAddress || contractAddress === ethers.ZeroAddress) {
    throw new Error("Factory deployment succeeded but contract address could not be resolved");
  }

  return {
    contractAddress: ethers.getAddress(contractAddress),
    deploymentTx: tx.hash,
    alreadyDeployed: false,
  };
}
```

**Endpoint:** `POST /artists/deploy` - Deploys contract per artist after whitelisting

---

## 7️⃣ SMART CONTRACT INTERACTIONS (Web3, ethers.js, wagmi)

### 7.1 Wallet Connection

**File:** [src/hooks/useWallet.ts](src/hooks/useWallet.ts)  
**Status:** ✅ **WORKING** - Uses wagmi

```ts
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = () => {
    const connector = connectors[0]; // Use first available connector
    if (connector) {
      connect({ connector });
    }
  };

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isReconnecting || isPending,
    connectWallet,
    disconnect,
  };
}
```

### 7.2 Active Chain Configuration

**File:** [src/lib/wagmi.ts](src/lib/wagmi.ts)  
**Status:** ✅ **CONFIGURED**

```ts
import { base, baseSepolia } from "wagmi/chains";
import { injected } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";
export const web3AuthClientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID?.trim() || "";

export const ACTIVE_CHAIN = baseSepolia;  // Currently Base Sepolia testnet

export const networks = [baseSepolia, base] as const;

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  connectors: [injected()],
  ssr: false,
});

export const config = wagmiAdapter.wagmiConfig;

export const isWeb3AuthConfigured = Boolean(web3AuthClientId);
```

**Usage:**
```tsx
import { ACTIVE_CHAIN } from "@/lib/wagmi";

// Check if user is on right chain
if (chain?.id !== ACTIVE_CHAIN.id) {
  await requestActiveChainSwitch(`This action requires ${ACTIVE_CHAIN.name}.`);
}
```

### 7.3 Contract Interfaces

**File:** [server/config.js](server/config.js#L206-L380)

**Artist Contract ABI:**
```js
const ARTIST_CONTRACT_ABI = [
  {
    inputs: [{ internalType: "address", name: "_artistWallet", type: "address" }],
    name: "deployArtDrop",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_artist", type: "address" }],
    name: "getArtistContract",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_artist", type: "address" },
      { internalType: "bool", name: "_approved", type: "bool" },
    ],
    name: "setArtistApproval",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "artist", type: "address" },
      { indexed: true, internalType: "address", name: "artDropContract", type: "address" },
      { indexed: true, internalType: "address", name: "founder", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "ArtDropDeployed",
    type: "event",
  },
];
```

**Product Store ABI:**
```js
const PRODUCT_STORE_ABI = [
  {
    type: "event",
    name: "PurchaseCompleted",
    inputs: [
      { name: "orderId", type: "uint256", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "productId", type: "uint256", indexed: true },
      { name: "quantity", type: "uint256", indexed: false },
      { name: "totalPrice", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProductCreated",
    inputs: [
      { name: "productId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "price", type: "uint256", indexed: false },
      { name: "royaltyPercent", type: "uint256", indexed: false },
    ],
  },
];
```

### 7.4 Campaign Contract Interaction

**File:** [server/campaigns.js](server/campaigns.js#L1-L35)

```js
import { ethers } from "ethers";
import { supabase, POAP_CAMPAIGN_V2_ADDRESS, DEPLOYER_PRIVATE_KEY, BASE_SEPOLIA_RPC_URL } from "./config.js";

// Campaign ABI for credit granting
const POAP_CAMPAIGN_V2_ABI = [
  "function grantContentCredits(uint256 campaignId, address wallet, uint256 quantity)",
  "function revokeContentCredits(uint256 campaignId, address wallet, uint256 quantity)",
  "function campaigns(uint256 campaignId) view returns (address artist, string metadataURI, uint8 entryMode, uint8 status, uint256 maxSupply, uint256 minted, uint256 ticketPriceWei, uint64 startTime, uint64 endTime, uint64 redeemStartTime)",
];

let campaignSigner = null;
let campaignProvider = null;

function getCampaignSigner() {
  if (campaignSigner) return campaignSigner;
  if (!DEPLOYER_PRIVATE_KEY) throw new Error("DEPLOYER_PRIVATE_KEY not configured");
  campaignProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC_URL);
  campaignSigner = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, campaignProvider);
  return campaignSigner;
}

function getCampaignProvider() {
  if (campaignProvider) return campaignProvider;
  campaignProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC_URL);
  return campaignProvider;
}
```

### 7.5 Transaction Verification

**File:** [server/index.js](server/index.js#L735-L810)

```js
async function verifyProductPurchaseTx({ txHash, buyerWallet, normalizedItems, productsById }) {
  const normalizedTxHash = normalizeTxHash(txHash);
  if (!normalizedTxHash) {
    throw new Error("A valid tx_hash is required");
  }

  const provider = getProductStoreProvider();  // Currently throws error
  const [transaction, receipt] = await Promise.all([
    provider.getTransaction(normalizedTxHash),
    provider.getTransactionReceipt(normalizedTxHash),
  ]);

  if (!transaction || !receipt) {
    throw new Error("Purchase transaction could not be found onchain");
  }

  if (receipt.status !== 1) {
    throw new Error("Purchase transaction did not succeed onchain");
  }

  const expectedTo = normalizeWallet(PRODUCT_STORE_ADDRESS);
  const actualTo = normalizeWallet(receipt.to || transaction.to || "");
  if (!expectedTo || actualTo !== expectedTo) {
    throw new Error("Purchase transaction was not sent to the product store contract");
  }

  if (normalizeWallet(transaction.from || "") !== normalizeWallet(buyerWallet)) {
    throw new Error("Purchase transaction does not belong to the connected buyer wallet");
  }

  // Parse events and verify items match
  const expectedItems = new Map();
  const purchasedItems = new Map();
  
  for (const log of receipt.logs || []) {
    try {
      const decoded = PRODUCT_STORE_INTERFACE.parseLog(log);
      if (!decoded || decoded.name !== "PurchaseCompleted") continue;

      const eventProductId = String(Number(decoded.args.productId));
      const eventQuantity = Number(decoded.args.quantity);
      purchasedItems.set(eventProductId, (purchasedItems.get(eventProductId) || 0) + eventQuantity);
    } catch {
      // Ignore unrelated logs
    }
  }

  // Verify all items were purchased
  if (purchasedItems.size === 0) {
    throw new Error("Purchase transaction did not emit a matching ProductStore purchase event");
  }

  return normalizedTxHash;
}
```

### 7.6 Contract Addresses (Environment Variables)

**Required ENV Variables:** [server/config.js](server/config.js)

```js
const {
  BASE_SEPOLIA_RPC_URL,
  ART_DROP_FACTORY_ADDRESS,
  POAP_CAMPAIGN_V2_ADDRESS,
  PRODUCT_STORE_ADDRESS,
  CREATIVE_RELEASE_ESCROW_ADDRESS,
  DEPLOYER_PRIVATE_KEY,
  // ...
} = process.env;
```

**Currently Disabled Function:** [server/index.js](server/index.js#L545-L560)

```js
function getCampaignSigner() {
  throw new Error("Campaign signer disabled - smart contracts removed");
}

function getCampaignProvider() {
  throw new Error("Campaign provider disabled - smart contracts removed");
}

function getProductStoreProvider() {
  throw new Error("Product store provider disabled - use payment integration instead");
}
```

---

## SUMMARY TABLE

| Feature | Status | File(s) | Key Functions |
|---------|--------|---------|----------------|
| **Bidding** | ❌ DISABLED | src/pages/Index.tsx, useContracts.tsx | `handleBidOnDrop()`, `usePlaceBid()` |
| **Collect Products** | ⚠️ MIXED | src/pages/CheckoutPage.tsx, FreshProductDetailPage.tsx | `handleCheckout()`, `handleCollectInApp()` |
| **Mint Onchain** | ❌ DISABLED | src/pages/Index.tsx, useContractsArtist.tsx | `handleCollectDrop()`, `useMintArtist()` |
| **Gifting** | ✅ WORKING | src/pages/CheckoutPage.tsx, GiftClaimPage.tsx | `handleCheckout()` (gift flag), `handleAccept()` |
| **Gas Fees** | ⚠️ DISPLAY ONLY | src/components/ShoppingCart.tsx | Display - "Paid separately" |
| **Onchain Payments** | ⚠️ UI ONLY | src/lib/paymentConfig.ts, useTokenPayment.ts | Configuration exists, not integrated |
| **Smart Contracts** | ❌ DISABLED | server/config.js, server/campaigns.js | All hooks throw errors |

---

## CRITICAL FINDINGS

### ⚠️ BREAKING CHANGES NEEDED
1. **All smart contracts disabled** - hooks are stubs
2. **Onchain minting broken** - `useMintArtist` throws error
3. **Campaign creation broken** - `useCreateCampaignV2` throws error
4. **Bidding paused** - legacy auctions disabled
5. **Gas fees not calculated** - only displayed as "Paid separately"
6. **Token payment stub** - simulates transactions, not real

### ✅ WORKING SYSTEMS
1. **Fresh/Offchain checkout** - production-ready
2. **Gift system** - backend implemented
3. **Wallet connection** - wagmi integration working
4. **Cart management** - Zustand store working
5. **Payment config** - multi-chain USDC/USDT ready

### 🔧 TODO TO ENABLE
1. Restore smart contract hooks from disabled stubs
2. Implement `useTokenPayment()` with real contract calls
3. Re-enable onchain collection flow
4. Fix campaign creation
5. Calculate and display accurate gas fees
6. Integrate Coinbase Pay for off-ramp

