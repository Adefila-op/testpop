/**
 * Routing Configuration Reference
 * Location: src/ROUTING.md
 * 
 * Complete guide to all routes and navigation structure
 */

# POPUP Marketplace - Routing Configuration

## 🗺️ Core Navigation Routes

### Primary Navigation (TopBar)
- **Home** (`/`) - Main landing page
- **Discover** (`/discover`) - Product feed and discovery
- **Profile** (`/profile`) - User profile and account management

---

## 📱 Secondary Navigation Routes

### Marketplace Section
```
/marketplace/
├── browse     - Browse all products and marketplace grid
├── auctions   - View active auctions and bidding activity
└── gifts      - Send and receive NFT gifts
```

### Collection Section
```
/collection/
├── nfts       - View user's owned NFT collection
└── purchases  - Purchase history and transaction details
```

### Creator Section
```
/creator/
├── earnings              - View total and pending earnings
├── royalties             - Secondary market royalty dashboard
├── payout-history        - View past payout transactions
├── collaborators         - Manage revenue split collaborators
└── payout-settings       - Configure payout method (ETH/USDC/USDT)
```

### Admin Section
```
/admin/
└── dashboard - System overview and platform statistics
```

---

## 🔗 Legacy Routes (Legacy Support)

These routes are maintained for backward compatibility:
- `/products` → Redirects to `/marketplace/browse`
- `/checkout` → Legacy checkout flow
- `/gift/:token` → Gift claim page
- `/products/:id` → Legacy product detail
- `/artists` → Artists listing
- `/artists/:id` → Artist profile
- `/studio` → Creator studio
- `/creator/analytics` → Legacy creator analytics

### Automatic Redirects
- `/marketplace` → `/marketplace/browse`
- `/collection` → `/collection/nfts`
- `/cart` → `/profile`
- `/orders` → `/profile`
- `/poaps` → `/profile`
- `/subscriptions` → `/profile`
- `/feed` → `/discover`
- `/catalog` → `/discover`
- `/share/:postId` → `/discover`

---

## 📁 Component Organization

### Page Components
```
src/pages/
├── RebootHomePage.tsx                    (/)
├── RebootDiscoverFeedPage.tsx            (/discover)
├── RebootProfileDashboardPage.tsx        (/profile)
├── NotFound.tsx                          (404)
│
├── marketplace/
│   ├── MarketplaceGrid.tsx               (/marketplace/browse)
│   ├── AuctionActivityPage.tsx           (/marketplace/auctions)
│   └── GiftHistoryPage.tsx               (/marketplace/gifts)
│
├── collection/
│   ├── UserNFTsPage.tsx                  (/collection/nfts)
│   └── PurchaseHistoryPage.tsx           (/collection/purchases)
│
├── creator/
│   ├── EarningsPage.tsx                  (/creator/earnings)
│   ├── RoyaltyDashboardPage.tsx          (/creator/royalties)
│   ├── PayoutHistoryPage.tsx             (/creator/payout-history)
│   ├── CreatorCollaboratorsPage.tsx      (/creator/collaborators)
│   └── PayoutSettingsPage.tsx            (/creator/payout-settings)
│
└── admin/
    └── AdminDashboardPage.tsx            (/admin/dashboard)
```

### UI Components
```
src/components/
├── AppLayout.tsx                    - Main page layout with navigation
├── TopBar.tsx                       - Primary navigation bar
├── SecondaryNav.tsx                 - Secondary navigation menu
├── NavLink.tsx                      - Navigation link component
├── appShellNav.ts                   - Navigation configuration
│
├── phase3/
│   ├── auction/
│   │   ├── BidPlacementWidget.tsx   - Place bid interface
│   │   ├── AuctionTimer.tsx         - Countdown timer
│   │   ├── BidHistoryList.tsx       - Bid history display
│   │   └── AuctionLeaderboard.tsx   - Auction status display
│   │
│   ├── gift/
│   │   ├── GiftDialog.tsx           - Create gift form
│   │   └── GiftInbox.tsx            - Received gifts list
│   │
│   ├── ProductCard.tsx              - Product listing card
│   └── ItemDetailModal.tsx          - Product detail view
```

---

## 🧭 Navigation Flow

### User Journey: Browsing Products
```
Home (/) 
  → Discover (/discover)
    → Product Details
      → Buy → Checkout
      → Auction → Place Bid
      → Gift → Send Gift
```

### User Journey: Creator
```
Profile (/profile)
  → Marketplace > Browse (/marketplace/browse)
    → Create Product
    → Create Auction (/marketplace/auctions)
  → Creator > Earnings (/creator/earnings)
    → Claim Payout
    → View History (/creator/payout-history)
    → Manage Collaborators (/creator/collaborators)
    → Configure Settings (/creator/payout-settings)
    → View Royalties (/creator/royalties)
```

### User Journey: Collections
```
Profile (/profile)
  → Collection > My NFTs (/collection/nfts)
    → View Details
    → Start Auction
    → Send as Gift
  → Collection > Purchases (/collection/purchases)
    → View History
    → View Details
```

---

## 🔌 Routing Configuration Files

### App.tsx
- Main router setup
- Route definitions
- Lazy-loaded page imports
- Provider setup (QueryClient, Wallet, Theme, etc.)

### appShellNav.ts
- Primary navigation items (`appShellNavItems`)
- Secondary navigation sections (`secondaryNavItems`)
- Active state detection (`isAppShellNavActive`)

### SecondaryNav.tsx
- Secondary navigation UI component
- Expandable sections for marketplace, collection, creator, admin
- Active link highlighting

### AppLayout.tsx
- Page layout wrapper
- TopBar + SecondaryNav + Outlet structure
- Background and styling

---

## 📊 Active Route Detection

The navigation system tracks active states using the `isAppShellNavActive` function:

```typescript
// Primary navigation: Active if matching path or in related section
isAppShellNavActive("/profile", "/creator/earnings") // true
isAppShellNavActive("/discover", "/share/123") // false

// Detects parent section matching:
- "/" matches only exact "/"
- "/discover" matches "/discover*"
- "/profile" matches profile/* and related paths (checkout, gift, etc.)
```

---

## 🎯 Adding New Routes

When adding new pages:

1. **Create page file** in appropriate folder:
   ```
   src/pages/[section]/NewPage.tsx
   ```

2. **Add lazy import** in App.tsx:
   ```typescript
   const NewPage = lazy(() => import("./pages/[section]/NewPage"));
   ```

3. **Add route** in App.tsx Routes:
   ```typescript
   <Route path="/section/new-page" element={<NewPage />} />
   ```

4. **Add navigation item** in appShellNav.ts (if needed):
   ```typescript
   secondaryNavItems.find(s => s.section === "Section").items.push({
     icon: IconName,
     label: "New Page",
     path: "/section/new-page"
   });
   ```

5. **Update active state** detection if needed:
   ```typescript
   // In isAppShellNavActive function
   if (itemPath === "/profile" && pathname.startsWith("/new-section")) {
     return true;
   }
   ```

---

## 🧪 Testing Routes

### Manual Testing Checklist
- [ ] All primary navigation items clickable
- [ ] Secondary navigation sections expandable
- [ ] Active state highlights correctly
- [ ] Route parameters work (:token, :id)
- [ ] Redirects function properly
- [ ] 404 page displays for invalid routes
- [ ] Back button works correctly
- [ ] Browser history preserved
- [ ] Mobile navigation functional
- [ ] Icons display correctly

### Automated Testing
```bash
# Test route definitions
npm test -- App.test.tsx

# Test navigation components
npm test -- TopBar.test.tsx
npm test -- SecondaryNav.test.tsx

# Test routing logic
npm test -- appShellNav.test.ts
```

---

## 📱 Mobile Navigation

Secondary navigation is displayed:
- Desktop: Expandable sections below top navigation
- Tablet: Grid layout
- Mobile: Via bottom navigation or menu

The SecondaryNav component is responsive and adapts to screen size.

---

## 🔐 Protected Routes

Routes requiring wallet connection:
- `/collection/*` - Requires connected wallet
- `/creator/*` - Requires connected wallet
- `/admin/*` - Requires admin authentication

Protected routes are handled by component-level `useAccount()` checks in each page.

---

## 📈 Route Performance

- **Lazy Loading**: All pages are lazy-loaded for better initial load time
- **Suspense**: LoadingSpinner displays during page transitions
- **Code Splitting**: Each route has its own code chunk
- **Prefetch**: Popular routes can be prefetched using React Router v6.4+

---

**Last Updated**: April 16, 2026  
**Status**: Phase 3.3 Complete ✅
