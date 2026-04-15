# Hardcoded Data Audit Report
**Date:** April 15, 2026  
**Scope:** Complete codebase analysis (src/, server/, api/)

---

## Executive Summary

| Category | Count | Severity | Status |
|----------|-------|----------|--------|
| Mock Creator/Artist Data | 3 | High | Should be replaced with API calls |
| Mock Products | 7 | High | Should be fetched from database |
| Mock Posts | 6 | High | Should be fetched from database |
| Mock Orders/Carts | Empty arrays | Medium | Ready for backend integration |
| Sample URLs (Unsplash/Dummy) | 100+ | High | Should use real CDN/asset endpoints |
| Hardcoded Navigation Items | 1 set | Low | UI configuration - acceptable |
| Status/Mode Constants | 3 sets | Low | Configuration constants - acceptable |
| Checkout Countries | 7 | Medium | Should be fetched from config service |
| Contract Addresses | 6 addresses | Low | Configuration via .env - acceptable |
| Placeholder Wallet Addresses | 5+ | High | Should use authenticated user wallets |
| Test Fixtures | 1 file | Medium | Test data - acceptable |
| Example Page Components | 4 pages | Medium | Example/reference code - mark as dead code |

---

## Detailed Findings

### 1. MOCK CREATOR DATA

| File | Line | Data | Issue | Replacement |
|------|------|------|-------|-------------|
| [server/freshApp.js](server/freshApp.js#L103) | 103-170 | 3 hardcoded creators (Aurora Vale, Nova Ikeda, Rio Mercer) | Sample data never cleaned up, used in development | Replace with `/api/artists` endpoint call |
| [server/fresh-db.json](server/fresh-db.json#L1) | 1-60 | Same 3 creators in JSON | Duplicate mock data | Remove and use database queries |

**Sample Creator Objects:**
- `creator-aurora`: Aurora Vale, @auroravale, with Unsplash images
- `creator-nova`: Nova Ikeda, @novaikeda, with Unsplash images  
- `creator-rio`: Rio Mercer, @riomercer, with Unsplash images

**Suggested API Endpoint:**
```typescript
GET /api/artists?featured=true&limit=10
// Response: Array of artist objects with ID, name, bio, images, etc.
```

---

### 2. MOCK PRODUCT DATA

| File | Line | Product ID | Creator | Price | Issue | Replacement |
|------|------|-----------|---------|-------|-------|-------------|
| [server/freshApp.js](server/freshApp.js#L163) | 163-280 | product-starlit-book | creator-aurora | 0.032 ETH | Hardcoded test product | Replace with GET /api/products |
| [server/freshApp.js](server/freshApp.js#L180) | 180 | product-neon-ebook | creator-nova | 0.018 ETH | References dummy.pdf URL | Use actual delivery URLs |
| [server/freshApp.js](server/freshApp.js#L196) | 196 | product-rio-pack | creator-rio | 0.025 ETH | Uses dummy PDF | Fetch real files from storage |
| [server/freshApp.js](server/freshApp.js#L213) | 213 | product-aurora-zine | creator-aurora | 0.014 ETH | Dummy PDF reference | Connect to Pinata/CDN |
| [server/freshApp.js](server/freshApp.js#L231) | 231 | product-aurora-print | creator-aurora | 0.09 ETH | Physical product stub | Map to fulfillment service |
| [server/freshApp.js](server/freshApp.js#L245) | 245 | product-nova-collectible | creator-nova | 0.055 ETH | Mock onchain drop | Link to actual contract |
| [server/freshApp.js](server/freshApp.js#L264) | 264 | product-nova-video | creator-nova | 0.022 ETH | Sample video URL | Use real media delivery |

**Hardcoded Product URLs:**
- All products use [https://images.unsplash.com](https://images.unsplash.com) for images
- PDFs point to `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`
- Video points to `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4`

**Suggested API Endpoint:**
```typescript
GET /api/products?status=published&limit=20
// Or for specific creator:
GET /api/artists/:artistId/products
```

---

### 3. MOCK POST DATA

| File | Line | Post ID | Product | Caption | Issue |
|------|------|---------|---------|---------|-------|
| [server/freshApp.js](server/freshApp.js#L281) | 281-340 | post-1 | product-starlit-book | "Fresh deck drop..." | Hardcoded social post |
| [server/freshApp.js](server/freshApp.js#L285) | 285 | post-2 | product-neon-ebook | "Episode zero of the Neon..." | Dummy content |
| [server/freshApp.js](server/freshApp.js#L289) | 289 | post-3 | product-rio-pack | "Motion kit update..." | Test fixture |
| [server/freshApp.js](server/freshApp.js#L293) | 293 | post-4 | product-aurora-zine | "Limited zine preview..." | Never updated |
| [server/freshApp.js](server/freshApp.js#L298) | 298 | post-5 | product-aurora-print | "Holo print shipment..." | Sample data |
| [server/freshApp.js](server/freshApp.js#L303) | 303 | post-6 | product-nova-collectible | "Collectible drop: claim..." | Mock content |

**Suggested API Endpoint:**
```typescript
GET /api/posts?featured=true
GET /api/products/:productId/posts
```

---

### 4. MOCK EMPTY COLLECTIONS

| File | Line | Data | Status | Note |
|------|------|------|--------|------|
| [server/freshApp.js](server/freshApp.js#L342) | 342-346 | Empty arrays for orders, carts, gifts, collections, poaps, subscriptions | ✅ Ready | Initialize from user data on login |

**Empty Mock Data Found:**
```javascript
likes: [],
comments: [],
carts: {},
orders: [],
gifts: [],
collections: [],
poaps: [],
subscriptions: [],
pins: [],
```

**Note:** These are appropriate empty initializations for fresh app state. They should be populated from:
- `GET /api/users/me/orders`
- `GET /api/users/me/cart`
- `GET /api/users/me/subscriptions` (etc.)

---

### 5. SAMPLE URLS (UNSPLASH & TEST RESOURCES)

### 5.1 Unsplash Images (100+ instances)

| URL Pattern | Count | Files | Issue |
|-------------|-------|-------|-------|
| `https://images.unsplash.com/photo-*` | ~80+ | server/freshApp.js, server/fresh-db.json | Hardcoded free image service |
| `https://example.com/*` | 4+ | src/examples/PageExamples.tsx | Placeholder URLs in example code |

**Specific Instances:**

| Image Use Case | URL | File | Line |
|---|---|---|---|
| Creator Avatar | `https://images.unsplash.com/photo-1544005313-94ddf0286df2` | [server/freshApp.js](server/freshApp.js#L109) | 109 |
| Creator Banner | `https://images.unsplash.com/photo-1498050108023-c5249f4df085` | [server/freshApp.js](server/freshApp.js#L111) | 111 |
| Portfolio Item | `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee` | [server/freshApp.js](server/freshApp.js#L117) | 117 |
| Product Image | `https://images.unsplash.com/photo-1513364776144-60967b0f800f` | [server/freshApp.js](server/freshApp.js#L173) | 173 |

**Replacement Strategy:**

| Current | Replacement | API Endpoint |
|---------|-------------|---|
| Unsplash images | Pinata/IPFS uploads | POST /api/uploads (get image CID) |
| example.com URLs | Real feature images | GET /api/assets/:id |
| dummy.pdf | Actual PDFs from storage | GET /api/downloads/:id |
| sample-videos | Real product videos | POST /api/media/videos |

**Suggested API Implementation:**
```typescript
// Asset retrieval
GET /api/assets/:assetId  // Returns CDN URL from Pinata/IPFS
GET /api/creators/:creatorId/avatar  // Returns creator's avatar URL
GET /api/products/:productId/images  // Returns product images/previews
GET /api/downloads/:deliveryId/preview  // Returns preview URL for delivery
```

---

### 5.2 Dummy PDF Files

| URL | Count | Files | Purpose | Replacement |
|-----|-------|-------|---------|-------------|
| `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf` | 10+ | server/freshApp.js, server/fresh-db.json | Placeholder PDF for ebooks/zines | Actual PDFs from object storage |

---

### 5.3 Sample Video

| URL | Count | File | Purpose | Replacement |
|-----|-------|------|---------|-------------|
| `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4` | 2 | [server/freshApp.js](server/freshApp.js#L268) | Sample video reference | Pinata/CDN video delivery |

---

### 6. HARDCODED PAGE EXAMPLES

| File | Component | Lines | Type | Status | Note |
|------|-----------|-------|------|--------|------|
| [src/examples/PageExamples.tsx](src/examples/PageExamples.tsx) | HomePageExample | 34-100 | FAQ with example data | ⚠️ Dead Code | Contains hardcoded artist "Sarah NFT Sculptor" |
| [src/examples/PageExamples.tsx](src/examples/PageExamples.tsx) | ArtistProfilePageExample | 104-241 | Sample artist profile | ⚠️ Dead Code | Mock artist data should be replaced with actual fetch |
| [src/examples/PageExamples.tsx](src/examples/PageExamples.tsx) | ProductPageExample | 245-364 | Sample product | ⚠️ Dead Code | Hardcoded "Sarah NFT Sculptor" product |
| [src/examples/PageExamples.tsx](src/examples/PageExamples.tsx) | BlogPostExample | 369-470 | Sample blog post | ⚠️ Dead Code | Example article with placeholder content |

**Issues Found:**

```typescript
// Line 110 - Hardcoded artist
const artist = {
  id: artistId || '1',
  name: 'Sarah NFT Sculptor',  // ← Hardcoded
  bio: 'Creating digital sculptures...',
  avatar_url: 'https://example.com/artist-avatar.jpg',
  // ... more mock fields
};

// Line 123 - Hardcoded drop
const drops = [
  {
    id: 'drop-1',  // ← Hardcoded
    title: '3D Digital Sculptures vol. 1',
    // ... mock data
  }
];
```

**Replacement Strategy:**
- These are example/reference files meant for developers
- Should either:
  1. Be removed if not in use
  2. Be moved to `/docs/examples` folder
  3. Be marked with clear comments: `// EXAMPLE CODE - DO NOT USE IN PRODUCTION`

---

### 7. CONFIGURATION CONSTANTS (Generally Acceptable)

### 7.1 Navigation Items

| File | Lines | Data | Type | Status |
|------|-------|------|------|--------|
| [src/components/appShellNav.ts](src/components/appShellNav.ts#L3) | 3-7 | 3 nav items (Home, Discover, Profile) | Static UI Config | ✅ Acceptable |

```typescript
export const appShellNavItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Sparkles, label: "Discover", path: "/discover" },
  { icon: User, label: "Profile", path: "/profile" },
] as const;
```

**Status:** This is application configuration, not mock data. Acceptable to keep hardcoded.

---

### 7.2 Checkout Countries

| File | Lines | Count | Status |
|------|-------|-------|--------|
| [src/lib/checkout.ts](src/lib/checkout.ts#L1) | 1-12 | 7 countries | ⚠️ Medium Priority |

**Hardcoded Countries:**
```typescript
export const CHECKOUT_COUNTRIES = [
  { name: "Nigeria", currency: "NGN", locale: "en-NG", dialCode: "+234", ... },
  { name: "United States", currency: "USD", locale: "en-US", dialCode: "+1", ... },
  { name: "United Kingdom", currency: "GBP", locale: "en-GB", dialCode: "+44", ... },
  { name: "Canada", currency: "CAD", locale: "en-CA", dialCode: "+1", ... },
  { name: "Germany", currency: "EUR", locale: "de-DE", dialCode: "+49", ... },
  { name: "France", currency: "EUR", locale: "fr-FR", dialCode: "+33", ... },
  { name: "Netherlands", currency: "EUR", locale: "nl-NL", dialCode: "+31", ... },
];
```

**Suggested API Endpoint:**
```typescript
GET /api/checkout/countries
// Allows dynamic management without redeployment
```

---

### 7.3 Status & Mode Constants

| File | Lines | Type | Count | Status |
|------|-------|------|-------|--------|
| [src/lib/catalogVisibility.ts](src/lib/catalogVisibility.ts#L3-L5) | 3-5 | Drop/Product Statuses | 11 values | ✅ Acceptable |
| [src/lib/rebootPlatform.ts](src/lib/rebootPlatform.ts#L7) | 7-58 | User flows/roles | 4 types | ✅ Acceptable |
| [src/lib/rebootPlatform.ts](src/lib/rebootPlatform.ts#L60) | 60-73 | Content types | 2 types | ✅ Acceptable |
| [src/lib/rebootPlatform.ts](src/lib/rebootPlatform.ts#L77) | 77-92 | Campaign modes | 3 types | ✅ Acceptable |

**Examples:**
```typescript
export const PUBLIC_PRODUCT_STATUSES = ["published", "active"] as const;
export const LIVE_DROP_STATUSES = ["live", "active", "published"] as const;
export const REBOOT_USER_FLOW = [ // 4 user type definitions
export const REBOOT_CAMPAIGN_MODES = [ // 3 campaign type definitions
```

**Status:** These are business logic enums/constants. Acceptable to keep hardcoded since they don't change frequently.

---

### 8. NETWORK & CONTRACT CONFIGURATION

| File | Type | Status |
|------|------|--------|
| [.env.local](.env.local) | Contract addresses (6 addresses) | ✅ Acceptable (env vars) |
| [.env.local.example](.env.local.example) | Example contract addresses | ✅ Acceptable |
| [server/.env.local](server/.env.local) | Backend contract config | ✅ Acceptable |
| [src/lib/paymentConfig.ts](src/lib/paymentConfig.ts#L37) | Token addresses (6 chains) | ✅ Acceptable (config) |

**Contract Addresses in Code:**

| File | Line | Address | Purpose | Status |
|------|------|---------|---------|--------|
| [src/lib/paymentConfig.ts](src/lib/paymentConfig.ts#L37) | 37 | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 | USDC (Base) | ✅ Config |
| [src/lib/paymentConfig.ts](src/lib/paymentConfig.ts#L53) | 53 | 0xfde4C96c8593536E31F26ECd50712f94295e27e7 | USDT (Polygon) | ✅ Config |
| [src/lib/paymentConfig.ts](src/lib/paymentConfig.ts#L70) | 70 | 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 | USDC (Polygon) | ✅ Config |

**Status:** Contract addresses should be in environment config or contract registry. Consider moving to a centralized config service.

---

### 9. PLACEHOLDER WALLET ADDRESSES

| File | Address | Type | Issue | Severity |
|------|---------|------|-------|----------|
| [src/components/wallet/DropPrimaryActionCard.tsx](src/components/wallet/DropPrimaryActionCard.tsx#L53) | 0x0000000000000000000000000000000000000000 | Zero address constant | Sentinel value - hardcoded check | ✅ Acceptable |
| [src/components/CreateCampaignDialog.tsx](src/components/CreateCampaignDialog.tsx#L19) | 0x0000000000000000000000000000000000000000 | Zero address constant | Sentinel value - hardcoded check | ✅ Acceptable |
| [src/pages/DropDetailPage.tsx](src/pages/DropDetailPage.tsx#L30) | 0x0000000000000000000000000000000000000000 | Zero address check | Used to detect undeployed contracts | ✅ Acceptable |
| [src/pages/ArtistStudioPage.tsx](src/pages/ArtistStudioPage.tsx#L178) | 0x0000000000000000000000000000000000000000 | Zero address constant | Mock mode detection | ✅ Acceptable |
| [.env.local](.env.local#L41) | 0x04de2ee1cf5a46539d1dbed0ec8f2a541ac5412c | Admin wallet | Test admin account | ⚠️ Production concern |
| [server/.env.local](server/.env.local#L32) | 0x3d9a4f8e9be795c7e82da4fed21cdd0d5234513e | Admin wallet | Test account | ⚠️ Production concern |

**Status:**
- Zero addresses (0x0000...0000) are acceptable sentinel values
- Admin wallets in .env.local are development only - ✅ OK
- Must be changed in production environments

---

### 10. TEST FILES & FIXTURES

| File | Lines | Type | Status | Note |
|------|-------|------|--------|------|
| [src/test/example.test.ts](src/test/example.test.ts#L18) | 18 | Test utility call | ✅ Acceptable | Testing code - expected to have fixture data |
| [server/fresh-db.json](server/fresh-db.json) | Full file | Test database fixture | ✅ Acceptable | Used for fresh app initialization |
| [playwright-fixture.ts](playwright-fixture.ts) | Full file | E2E test fixture | ✅ Acceptable | Testing infrastructure |

---

## Impact Analysis

### High Priority (Requires Replacement)

| Issue | Files | Impact | Effort | Timeline |
|-------|-------|--------|--------|----------|
| Mock product data | server/freshApp.js, fresh-db.json | Users see fake products permanently | High | Week 1-2 |
| Mock creator data | server/freshApp.js, fresh-db.json | No real artist representation | High | Week 1-2 |
| Unsplash hardcoded images | ~80 instances | CDN usage/attribution issues | Medium | Week 2 |
| Mock post data | server/freshApp.js | No real social content | Medium | Week 3 |

### Medium Priority (Should Improve)

| Issue | Files | Impact | Effort | Timeline |
|-------|-------|--------|--------|----------|
| Example page components | src/examples/PageExamples.tsx | Dead code confusion | Low | Week 2 |
| Checkout countries hardcoded | src/lib/checkout.ts | Limited geographic support | Low | Week 3 |
| Dummy PDF/video URLs | 10+ instances | Delivery failure | Medium | Week 2 |

### Low Priority (Acceptable)

| Issue | Files | Impact | Status |
|-------|-------|--------|--------|
| Navigation constants | appShellNav.ts | None - configuration | Keep as-is |
| Status/Mode enums | Multiple | None - business logic | Keep as-is |
| Contract addresses in env | .env files | None - environment vars | Keep as-is |
| Zero address sentinels | Multiple files | None - sentinel values | Keep as-is |

---

## Recommended Actions

### Phase 1: Data Fetch Architecture (Week 1)
1. Create API endpoints for:
   - `GET /api/artists?featured=true` 
   - `GET /api/products?status=published`
   - `GET /api/posts?featured=true`
2. Implement React Query hooks for data fetching
3. Add error handling and loading states

### Phase 2: Remove Mock Fixtures (Week 1-2)
1. Delete mock creator/product/post arrays from [server/freshApp.js](server/freshApp.js)
2. Update [server/fresh-db.json](server/fresh-db.json) with real database queries
3. Replace hardcoded Unsplash URLs with API-driven asset fetching

### Phase 3: Update Asset Delivery (Week 2)
1. Migrate images from Unsplash to Pinata/IPFS
2. Replace dummy PDFs with real file references
3. Implement CDN URL generation from asset CIDs

### Phase 4: Documentation & Cleanup (Week 2-3)
1. Move/delete example page components or mark as dead code
2. Create comprehensive API integration guide
3. Document asset management system

---

## Code Quality Recommendations

### ✅ Keep Hardcoded
- Enum/constant definitions (statuses, modes, types)
- Navigation structure
- Environment variables
- Zero address sentinels
- Test fixtures and mock data in test files

### ❌ Replace with API Calls
- Product data arrays
- Creator/artist data arrays
- Social post content
- User collection data
- Order history
- Cart items

### ⚠️ Migrate to Config Service
- Checkout country list (move to `GET /api/config/checkout-countries`)
- Contract addresses (use contract registry/ABI service)
- Feature flags (implement feature flag service)

---

## Checklist for Refactoring

- [ ] Create backend API endpoints for dynamic data
- [ ] Remove all hardcoded product arrays
- [ ] Remove all hardcoded creator arrays
- [ ] Replace Unsplash URLs with asset API
- [ ] Update SEO example page or mark as dead code
- [ ] Implement React Query hooks for data fetching
- [ ] Add error boundaries for failed API calls
- [ ] Create fallback UI for loading states
- [ ] Test all data fetching flows
- [ ] Remove dummy PDF/video references
- [ ] Update documentation
- [ ] Run performance audit post-migration

---

## References

### Files Containing Hardcoded Data
1. [server/freshApp.js](server/freshApp.js) - 170+ lines of mock data
2. [server/fresh-db.json](server/fresh-db.json) - Complete test database
3. [src/examples/PageExamples.tsx](src/examples/PageExamples.tsx) - 470 lines of example data
4. [src/lib/checkout.ts](src/lib/checkout.ts) - Country configuration
5. [src/lib/paymentConfig.ts](src/lib/paymentConfig.ts) - Token addresses

### Related Documentation
- API_INTEGRATION_AUDIT_APRIL15_2026.md
- PINATA_SUPABASE_INTEGRATION_AUDIT.md
- IMPLEMENTATION_ROADMAP.md

---

**Report Generated:** April 15, 2026  
**Audit Status:** ✅ Complete  
**Next Steps:** Prioritize Phase 1 API endpoint creation
