# Complete Code Audit & Fixes - April 16, 2026

## Issue 1: Push Notifications Not Triggering Immediately on Mobile Install

### Root Cause
- Service worker is registered in `App.tsx` but never requests permission
- No subscription happens automatically
- `subscribeToPushNotifications()` is never called after installation
- Missing handler on app install event

### Location
- `src/App.tsx` - Missing push subscription logic
- `src/lib/webPush.ts` - Incomplete initialization
- `public/service-worker.js` - Service worker exists but not actively triggered

### Fixes Required
1. Auto-request notification permission after app loads
2. Auto-subscribe to push after permission granted
3. Add push subscription logic to app initialization
4. Track subscription state to prevent duplicate requests

### Code Changes
**File: `src/lib/webPush.ts`**
- Add `autoSubscribe()` function that auto-requests and subscribes
- Update initialization to attempt auto-subscribe even when offline

**File: `src/App.tsx`**
- Call `autoSubscribe()` after `initializePushNotifications()`
- Handle auth token retrieval for backend registration

---

## Issue 2: Connect Wallet Not Working

### Root Cause
- `useWallet()` hook may have unresolved connector issues
- Missing fallback for wallet connection
- Possible issue with wagmi adapter initialization
- Network switching might be failing silently

### Location
- `src/hooks/useWallet.ts` - Wallet connection logic
- `src/lib/wagmi.ts` - Wagon configuration
- `src/lib/appKit.ts` - App Kit modal handling 
- `src/components/WalletConnect.tsx` - UI component

### Fixes Required
1. Ensure wagmi config is properly initialized
2. Add error handling to connection flow
3. Add fallback connector if primary fails
4. Check VITE environment variables are set

### Critical Check
- `VITE_WALLETCONNECT_PROJECT_ID` must be set
- Service might not be calling `connectAsync` properly
- Need error logging for failed connections

---

## Issue 3: Deck & Buttons Not Fitting on Screen (Mobile Layout)

### Root Cause
- Buttons have fixed padding `px-4 py-2` that's too large on mobile
- Button container uses `flex flex-wrap` but buttons might still overflow
- Right panel (details) might be too wide on small screens
- No mobile responsiveness on deck card content

### Location
- `src/pages/RebootHomePage.tsx` - Lines 221-245 button section
- Deck card grid layout at line 179 `lg:grid-cols-[1.45fr_1fr]`

### Fixes Required
1. Make buttons responsive with `sm:` and `md:` breakpoints
2. Reduce padding on mobile: `px-2 py-1.5 sm:px-4 sm:py-2`
3. Reduce text size on mobile: `text-xs sm:text-sm`
4. Stack buttons vertically on mobile or make them smaller
5. Adjust grid layout for tablet/mobile views

---

## Issue 4: Profile Button Showing on Home Page Deck (Should Hide)

### Root Cause
- Line 220-224 in `RebootHomePage.tsx` unconditionally renders a "Profile" button
- This button shouldn't be part of the deck showcase

### Location
- `src/pages/RebootHomePage.tsx` - Lines 220-224

### Fixes Required
- Remove the dedicated "Profile" button from the deck
- Keep only the action buttons: Collect/View, Like
- Profile is accessible from header/nav anyway

---

## Issue 5: Marketplace Not Displaying - No Products Loading

### Root Cause
- Need to verify if `ProductsPage` is loading data correctly
- May be missing API endpoint or data source
- Query might be filtering out all products
- Possible authentication issue preventing product fetch

### Location
- `src/pages/ProductsPage.tsx` - Main marketplace page
- `src/hooks/useSupabase.ts` - Product data fetching
- `src/lib/db.ts` - Database queries

### Fixes Required
1. **Check Data Source**
   - Verify products table exists in Supabase
   - Check if products have correct `status` field
   - Verify `PUBLIC_PRODUCT_STATUSES` filter includes at least one status
   
2. **Add Debug Logging**
   - Log total products count
   - Log filter criteria
   - Log any query errors
   
3. **Check API Routes**
   - Verify `/api/products` endpoint exists
   - Check authorization headers
   - Verify response format

4. **Add Empty State Handling**
   - Show helpful message if no products
   - Provide action to create first product

---

## Summary of Changes

| Issue | File(s) | Priority | Estimated Fix Time |
|-------|---------|----------|-------------------|
| Push Notifications | `src/lib/webPush.ts`, `src/App.tsx` | HIGH | 30 min |
| Connect Wallet | `src/hooks/useWallet.ts`, `src/lib/wagmi.ts` | HIGH | 45 min |
| Mobile Layout | `src/pages/RebootHomePage.tsx` | HIGH | 30 min |
| Remove Profile Button | `src/pages/RebootHomePage.tsx` | LOW | 5 min |
| Marketplace Display | `src/pages/ProductsPage.tsx`, hooks | MEDIUM | 60 min |

**Total Estimated Time: 2.5 hours**

---

## Implementation Instructions

Execute fixes in this order:
1. ✅ Fix push notification auto-subscription
2. ✅ Improve wallet connection error handling
3. ✅ Fix responsive mobile layout
4. ✅ Remove profile button from deck
5. ✅ Debug and fix marketplace data loading

Start with higher severity issues first for maximum impact.
