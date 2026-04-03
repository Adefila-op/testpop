# Full System Audit And Schema

Generated from the current codebase on 2026-04-03.

This document explains:

- how the POPUP app is structured
- how the frontend, backend, Supabase, Pinata, and contracts fit together
- which tables power which features
- which routes and flows are actually used
- where the main architectural risks and transitional areas are

## 1. Executive Summary

POPUP is a hybrid creator platform with four active product surfaces:

- creator discovery and subscriptions
- collectible drops and campaigns
- commerce products and checkout
- admin-controlled artist approval and contract provisioning

The app is implemented as:

- a Vite + React frontend in `src/`
- an Express API in [server/index.js](./server/index.js)
- a Supabase database accessed both directly from the browser and through secure backend routes
- Pinata-backed media upload through authenticated backend proxy endpoints
- Base Sepolia smart-contract integrations for artist drops, POAP-style campaigns, subscriptions, shares, and product purchases

The current system is functional, but it is still in a transitional architecture state:

- some reads go directly from the browser to Supabase
- writes and privileged actions go through the secure Express API
- the code contains compatibility fallbacks for old and new Supabase schemas
- some newer schema domains exist in SQL but are only partially used in frontend flows

## 2. High-Level Architecture

### Frontend

Main app shell:

- [src/App.tsx](./src/App.tsx)
- [src/components/AppLayout.tsx](./src/components/AppLayout.tsx)
- [src/components/TopBar.tsx](./src/components/TopBar.tsx)
- [src/components/BottomNav.tsx](./src/components/BottomNav.tsx)
- [src/components/theme-provider.tsx](./src/components/theme-provider.tsx)

State and feature layers:

- React Query for networked Supabase reads
- Zustand stores for cart, collection, campaign, and product UI state
- wagmi + Reown/AppKit wallet integration
- secure runtime wallet session stored in browser session memory/storage

### Backend

Primary API server:

- [server/index.js](./server/index.js)

Responsibilities:

- wallet auth challenge/verify
- secure writes to Supabase
- admin authorization
- Pinata proxy uploads
- artist approval and contract deployment
- order creation and seller order updates
- campaign submission moderation

### Database

Primary persistence:

- Supabase Postgres
- bootstrap schema file: [SUPABASE_SCHEMA.sql](./SUPABASE_SCHEMA.sql)
- source migrations: [supabase/migrations](./supabase/migrations)

### Media

Media stack:

- files pinned to Pinata/IPFS
- frontend resolves IPFS URIs to gateway URLs via [src/lib/pinata.ts](./src/lib/pinata.ts)
- uploads are proxied through authenticated backend routes

### Onchain

Contract integration areas:

- per-artist ArtDrop contracts
- ArtDrop factory
- POAP campaign contracts
- ProductStore purchase contract
- ArtistSharesToken campaign contract

Primary integration files:

- [src/lib/contracts/artDropFactory.ts](./src/lib/contracts/artDropFactory.ts)
- [src/lib/contracts/artDropArtist.ts](./src/lib/contracts/artDropArtist.ts)
- [src/lib/contracts/poapCampaign.ts](./src/lib/contracts/poapCampaign.ts)
- [src/lib/contracts/poapCampaignV2.ts](./src/lib/contracts/poapCampaignV2.ts)
- [src/lib/contracts/productStore.ts](./src/lib/contracts/productStore.ts)
- [src/lib/contracts/artistSharesToken.ts](./src/lib/contracts/artistSharesToken.ts)

## 3. Codebase Functional Map

### App entry and routing

The router in [src/App.tsx](./src/App.tsx) mounts these main screens:

- `/` home / featured creators / live drops
- `/apply` artist application
- `/drops` drop discovery
- `/drops/:id` drop detail
- `/artists` creator discovery
- `/artists/:id` creator profile
- `/invest` IP/campaign investment surface
- `/profile` wallet profile
- `/collection` owned or purchased items
- `/poaps` campaign rewards view
- `/subscriptions` creator subscriptions
- `/products` shop
- `/products/:id` product detail
- `/cart` cart
- `/checkout` product checkout
- `/orders` buyer order history
- `/admin` admin console
- `/studio` creator studio

### Key frontend feature files

Public discovery:

- [src/pages/Index.tsx](./src/pages/Index.tsx)
- [src/pages/DropsPage.tsx](./src/pages/DropsPage.tsx)
- [src/pages/ArtistsPage.tsx](./src/pages/ArtistsPage.tsx)
- [src/pages/ArtistProfilePage.tsx](./src/pages/ArtistProfilePage.tsx)

Commerce:

- [src/pages/ProductsPage.tsx](./src/pages/ProductsPage.tsx)
- [src/pages/ProductDetailPage.tsx](./src/pages/ProductDetailPage.tsx)
- [src/pages/CartPage.tsx](./src/pages/CartPage.tsx)
- [src/pages/CheckoutPage.tsx](./src/pages/CheckoutPage.tsx)
- [src/pages/OrderHistoryPage.tsx](./src/pages/OrderHistoryPage.tsx)
- [src/pages/MyCollectionPage.tsx](./src/pages/MyCollectionPage.tsx)

Creator tools:

- [src/pages/ArtistStudioPage.tsx](./src/pages/ArtistStudioPage.tsx)
- [src/pages/ArtistApplicationPage.tsx](./src/pages/ArtistApplicationPage.tsx)

Admin:

- [src/pages/AdminPage.tsx](./src/pages/AdminPage.tsx)
- [src/components/AdminGuard.tsx](./src/components/AdminGuard.tsx)
- [src/lib/adminApi.ts](./src/lib/adminApi.ts)

Wallet/session:

- [src/lib/secureAuth.ts](./src/lib/secureAuth.ts)
- [src/lib/runtimeSession.ts](./src/lib/runtimeSession.ts)
- [src/hooks/useContracts.ts](./src/hooks/useContracts.ts)
- [src/components/wallet/WalletRuntimeProvider.tsx](./src/components/wallet/WalletRuntimeProvider.tsx)

Supabase read layer:

- [src/hooks/useSupabase.ts](./src/hooks/useSupabase.ts)
- [src/lib/supabaseStore.ts](./src/lib/supabaseStore.ts)
- [src/lib/db.ts](./src/lib/db.ts)

Local UX stores:

- [src/stores/cartStore.ts](./src/stores/cartStore.ts)
- [src/stores/collectionStore.ts](./src/stores/collectionStore.ts)
- [src/stores/campaignStore.ts](./src/stores/campaignStore.ts)
- [src/stores/productStore.ts](./src/stores/productStore.ts)

## 4. Runtime Layering

The app uses three overlapping data access styles.

### Layer A: public browser-to-Supabase reads

Used for:

- artist discovery
- drop discovery
- product catalog
- some order/history reads

Main files:

- [src/lib/supabaseStore.ts](./src/lib/supabaseStore.ts)
- [src/hooks/useSupabase.ts](./src/hooks/useSupabase.ts)

### Layer B: secure backend writes

Used for:

- artist profile updates
- drop create/update/delete
- product create/update
- order create/update
- whitelist updates
- campaign submission review
- admin approval/rejection
- Pinata uploads

Main files:

- [src/lib/db.ts](./src/lib/db.ts)
- [server/index.js](./server/index.js)

### Layer C: onchain writes and reads

Used for:

- creator subscriptions
- artist drop minting
- campaign bids
- ProductStore product creation and purchase
- artist contract resolution
- shares campaign functions

Main files:

- hooks in `src/hooks/`
- contract wrappers in `src/lib/contracts/`

## 5. Auth And Session Model

Secure admin/artist operations use a wallet challenge flow.

### Flow

1. Frontend calls `/auth/challenge` or `/api/auth/challenge`
2. Backend issues a nonce and message
3. User signs the challenge in wallet
4. Frontend posts signature to `/auth/verify`
5. Backend verifies signature and returns:
   - `apiToken`
   - `supabaseToken`
   - `role`
6. Frontend stores the runtime session in [src/lib/runtimeSession.ts](./src/lib/runtimeSession.ts)
7. Secure API calls send the bearer token

### Critical dependency

This flow depends on the `nonces` table existing and being writable by the backend service role.

If `nonces` is missing, `/api/auth/challenge` fails and all secure admin/artist write flows break.

## 6. Backend API Surface

Primary backend file:

- [server/index.js](./server/index.js)

### Health and diagnostics

- `GET /health`
- `GET /debug/dist-status`

### Auth

- `POST /auth/challenge`
- `POST /api/auth/challenge`
- `POST /auth/verify`
- `POST /api/auth/verify`
- `GET /auth/session`
- `GET /api/auth/session`

### Artist management

- `POST /artists/profile`
- `POST /artists/contract-address`

### Drop management

- `POST /maintenance/cleanup-drops`
- `POST /drops`
- `PATCH /drops/:id`
- `DELETE /drops/:id`

### Campaign submissions

- `POST /campaigns/submissions`
- `GET /campaigns/:dropId/submissions`
- `POST /campaigns/:dropId/submissions/:submissionId/review`

### Product management

- `POST /products`
- `PATCH /products/:id`

### Orders

- `GET /orders`
- `POST /orders`
- `PATCH /orders/:id`

### Whitelist

- `POST /whitelist`
- `PATCH /whitelist/:id`
- `DELETE /whitelist/:id`

### Pinata proxy

- `POST /pinata/file`
- `POST /api/pinata/file`
- `POST /pinata/json`
- `POST /api/pinata/json`

### Admin

- `POST /admin/approve-artist`
- `POST /api/admin/approve-artist`
- `POST /admin/reject-artist`
- `POST /api/admin/reject-artist`
- `GET /admin/artists`
- `GET /api/admin/artists`

## 7. Database Schema By Domain

The executable schema lives in [SUPABASE_SCHEMA.sql](./SUPABASE_SCHEMA.sql).

This section explains the functional schema rather than dumping raw DDL.

### 7.1 Identity And Creator Domain

#### `artists`

Purpose:

- canonical creator profile
- wallet identity
- public profile metadata
- contract deployment metadata
- shares campaign metadata

Key fields used in code:

- `id`
- `wallet`
- `name`
- `handle`
- `bio`
- `tag`
- `avatar_url`
- `banner_url`
- `portfolio`
- `subscription_price`
- `contract_address`
- `contract_deployment_tx`
- `contract_deployed_at`
- transitional shares fields added by later migrations

Used by:

- home creator deck
- artists listing
- artist profile page
- studio profile editor
- admin approval and contract deployment

#### `whitelist`

Purpose:

- approval status for creators
- public/admin artist gate

Key fields:

- `wallet`
- `name`
- `status`
- `joined_at`
- `approved_at`
- `notes`
- `artist_id` in normalized schema

Used by:

- admin artist review
- public artist filtering fallback
- approval/rejection flow

#### `artist_applications`

Purpose:

- formal creator application intake
- stores richer onboarding details before approval

Used by:

- artist application flow
- admin review and artist provisioning context

#### `waitlist`

Purpose:

- general community/product waitlist
- not the same as artist approval whitelist

### 7.2 Drops Domain

#### `drops`

Purpose:

- collectible release catalog
- auctions
- creator campaign entries

Key fields:

- `id`
- `artist_id`
- `title`
- `description`
- `price_eth`
- `supply`
- `sold`
- `image_url`
- `image_ipfs_uri`
- `preview_uri`
- `delivery_uri`
- `asset_type`
- `is_gated`
- `metadata_ipfs_uri`
- `status`
- `type`
- `contract_address`
- `contract_drop_id`
- `contract_kind`
- `metadata`
- `ends_at`

Used by:

- home live drops carousel
- drops listing
- drop detail page
- creator studio drop management
- campaign submission workflows

Supported logical types:

- `drop`
- `auction`
- `campaign`

Supported public/live statuses:

- normalized from legacy variants into a live catalog view

#### `campaign_submissions`

Purpose:

- participant content submissions for campaign-type drops

Key fields:

- `drop_id`
- `submitter_wallet`
- `content_url`
- `caption`
- `status`
- `reviewed_by`
- `reviewed_at`
- `onchain_tx_hash`

Used by:

- campaign entry flow
- creator/admin moderation
- optional onchain content credit grant/revoke integration

### 7.3 Commerce Domain

#### `products`

Purpose:

- store catalog for physical, digital, and hybrid goods

Key fields:

- `id`
- `artist_id`
- `creator_wallet`
- `name`
- `description`
- `category`
- `product_type`
- `asset_type`
- `price_eth`
- `stock`
- `sold`
- `image_url`
- `image_ipfs_uri`
- `preview_uri`
- `delivery_uri`
- `is_gated`
- `status`
- `metadata`
- `contract_product_id`
- `metadata_uri`

Used by:

- shop
- product detail
- admin product creation
- checkout
- owned collection rendering

#### `product_assets`

Purpose:

- normalized asset model for preview, delivery, source, and attachment files

Important design intent:

- public preview media should be separate from purchased delivery media
- digital entitlements should be granted against asset records

Current usage state:

- present in schema
- not yet the only source of truth in the frontend
- some product and collection flows still read legacy `delivery_uri`/`preview_uri` fields directly from `products`

#### `orders`

Purpose:

- order header / buyer purchase record

Key fields:

- `buyer_wallet`
- `product_id`
- `quantity`
- `currency`
- `subtotal_eth`
- `shipping_eth`
- `tax_eth`
- `total_price_eth`
- `status`
- `shipping_address`
- `shipping_address_jsonb`
- `tracking_code`
- `tx_hash`
- `paid_at`
- `shipped_at`
- `delivered_at`

Used by:

- checkout confirmation
- buyer history
- seller/admin order review
- purchased collection derivation

#### `order_items`

Purpose:

- normalized line-item table for multi-product checkout

Key fields:

- `order_id`
- `product_id`
- `quantity`
- `unit_price_eth`
- `line_total_eth`
- `fulfillment_type`
- `delivery_status`

Used by:

- order normalization in `db.ts`
- purchased collection mapping
- future fulfillment/entitlement workflows

#### `entitlements`

Purpose:

- formal digital access rights after payment

Key fields:

- `order_id`
- `order_item_id`
- `product_id`
- `asset_id`
- `buyer_wallet`
- `access_type`
- `status`
- `granted_at`
- `expires_at`
- `access_count`

Current usage state:

- schema exists
- helper methods exist in `db.ts`
- main collection flow still primarily derives access from order status and legacy product URIs

#### `fulfillments`

Purpose:

- physical/digital delivery workflow records

Key fields:

- `order_id`
- `order_item_id`
- `product_id`
- `creator_wallet`
- `fulfillment_type`
- `status`
- `provider`
- `tracking_code`
- `tracking_url`
- `shipping_address_jsonb`

Current usage state:

- schema and helper layer exist
- not yet the primary operational driver of checkout completion in the frontend

### 7.4 Analytics Domain

#### `analytics`

Purpose:

- legacy analytics table

Used for:

- older page and artist event tracking

#### `analytics_events`

Purpose:

- newer event log for page views and object interactions

Likely events:

- page visits
- drop views
- product views
- collection/subscription activity

Used by:

- recommendation heuristics
- dashboard metrics

#### `artist_daily_metrics`

Purpose:

- aggregated artist-level daily rollups

Generated by:

- refresh SQL function in migrations

### 7.5 Auth And Admin Domain

#### `nonces`

Purpose:

- wallet login challenge persistence

Required for:

- `/api/auth/challenge`
- `/api/auth/verify`

#### `admin_audit_log`

Purpose:

- durable audit trail for admin actions

Logged examples:

- artist approval
- artist rejection

#### `audit_logs`

Purpose:

- older generic audit mechanism introduced by legacy RLS migration

Current state:

- exists as a legacy audit concept alongside `admin_audit_log`

### 7.6 IP Finance Domain

#### `ip_campaigns`

Purpose:

- tokenized creative investment / funding campaigns

Key fields:

- `artist_id`
- `slug`
- `title`
- `summary`
- `description`
- `campaign_type`
- `rights_type`
- `status`
- `visibility`
- `funding_target_eth`
- `minimum_raise_eth`
- `unit_price_eth`
- `total_units`
- `units_sold`
- `opens_at`
- `closes_at`
- `settlement_at`
- `shares_contract_address`
- `shares_contract_tx`
- `legal_doc_uri`
- `cover_image_uri`
- `metadata`

Used by:

- invest/admin/studio IP flows

#### `ip_investments`

Purpose:

- investor positions against `ip_campaigns`

#### `royalty_distributions`

Purpose:

- payout ledger for downstream revenue sharing

### 7.7 Subscription Domain

#### `subscriptions`

Purpose:

- relational subscription record with expiry support

Important note:

- the frontend also uses onchain creator subscription contracts
- so this domain is partly relational and partly contract-driven

SQL helper functions added in migrations:

- `is_subscription_active`
- `get_subscription_time_remaining`
- `renew_subscription`

## 8. Main Table Relationships

Core relationships:

- `artists.id -> drops.artist_id`
- `artists.id -> products.artist_id`
- `artists.id -> whitelist.artist_id` when present in normalized schema
- `artists.id -> ip_campaigns.artist_id`
- `drops.id -> campaign_submissions.drop_id`
- `products.id -> product_assets.product_id`
- `orders.id -> order_items.order_id`
- `products.id -> order_items.product_id`
- `orders.id -> entitlements.order_id`
- `order_items.id -> entitlements.order_item_id`
- `products.id -> entitlements.product_id`
- `product_assets.id -> entitlements.asset_id`
- `orders.id -> fulfillments.order_id`
- `order_items.id -> fulfillments.order_item_id`
- `products.id -> fulfillments.product_id`
- `ip_campaigns.id -> ip_investments.campaign_id`
- `ip_campaigns.id -> royalty_distributions.campaign_id`

## 9. End-To-End Functional Flows

### Public creator discovery flow

1. Home page and artists pages use `useSupabaseArtists`
2. `useSupabaseArtists` reads through [src/lib/supabaseStore.ts](./src/lib/supabaseStore.ts)
3. Public artist visibility is filtered either by:
   - native `artists.status`
   - or fallback approved wallets from `whitelist`
4. UI renders featured creators and profile links

### Public drops flow

1. Home and drops pages use `useSupabaseLiveDrops`
2. `supabaseStore.ts` queries `drops`
3. Drop records are normalized for old/new schemas
4. Artist relation is embedded if possible, or attached in a second query
5. Analytics view counts combine with sold count for recommended ordering

### Artist profile/studio flow

1. Artist signs in through secure wallet auth
2. Studio uses secure API write helpers in [src/lib/db.ts](./src/lib/db.ts)
3. Profile changes go to `/artists/profile`
4. Backend upserts the `artists` record

### Drop creation flow

1. Creator uploads cover/delivery assets through Pinata proxy
2. Studio builds metadata URIs and media URIs
3. Creator may create onchain drop or campaign contract entry
4. App records the drop in Supabase through `POST /drops`
5. Contract metadata is later synced back to the drop record

### Product creation flow

1. Admin or creator uploads product preview media
2. Product may also be created onchain through ProductStore
3. Product metadata stores `contract_product_id` and `metadata_uri`
4. Product row is persisted through `POST /products`

### Checkout flow

Current operational flow in [src/pages/CheckoutPage.tsx](./src/pages/CheckoutPage.tsx):

1. User checks out cart items
2. Each item is purchased onchain through ProductStore
3. After each onchain purchase, the app records an `orders` row through secure API
4. Order history and collection read back from Supabase

Important observation:

- although schema includes normalized order/entitlement design and a `create_checkout_order` RPC, the current frontend checkout flow still centers on direct onchain purchase plus `/orders` recording

### Collection access flow

1. Collection view merges:
   - local collected drops from Zustand
   - purchased products from order history
2. Order items are mapped into collection items
3. Media rendering chooses viewer based on inferred `asset_type`
4. Access is effectively gated by order status, not yet fully by `entitlements`

### Admin approval flow

1. Admin establishes secure wallet session
2. Admin calls approve/reject endpoints
3. Backend checks whitelist/application context
4. On approval, backend can:
   - mark artist approved onchain
   - deploy per-artist contract
   - update `artists`
   - update `whitelist`
   - log `admin_audit_log`

### Campaign submission moderation flow

1. User submits content to a campaign drop
2. Backend stores `campaign_submissions`
3. Artist/admin reviews submission
4. For POAP Campaign V2-backed drops, backend may grant/revoke content credits onchain
5. Supabase record is updated with review state and tx hash

## 10. Media And Asset Handling

Primary file:

- [src/lib/pinata.ts](./src/lib/pinata.ts)

How media currently works:

- upload is authenticated through backend
- backend forwards to Pinata
- frontend stores and resolves `ipfs://` URIs
- helper logic filters invalid `blob:` and transient preview URLs

Important implementation detail:

- the repo still carries legacy fields like `image_url`, `image_ipfs_uri`, `preview_uri`, and `delivery_uri`
- normalized `product_assets` exists but is not yet the only delivery model

## 11. Onchain Model

### Active contract concepts

- per-artist ArtDrop contract for creator-specific minting
- factory contract to resolve/deploy artist contracts
- POAP campaign contracts for campaign experiences
- ProductStore for product creation and purchase
- ArtistSharesToken for fundraising/share flows

### Important code note

[src/hooks/useContracts.ts](./src/hooks/useContracts.ts) explicitly retires the old shared ArtDrop path and leaves compatibility stubs for legacy hooks.

That means:

- per-artist contract paths are the intended model
- any UI or logic still expecting the old shared ArtDrop contract will fail or be inert

## 12. Compatibility And Migration Strategy In Code

The codebase contains many schema-compatibility branches.

Examples:

- old/new drop columns in `supabaseStore.ts`
- old/new artist visibility in `supabaseStore.ts`
- old/new product columns in `supabaseStore.ts`
- legacy order fallback in `db.ts`
- missing campaign submissions table handling in backend
- missing artist contract metadata column handling in backend

This is useful for survivability during migration, but it also means the app expects schema drift and is not yet operating against a single clean canonical runtime shape.

## 13. Audit Findings

### Finding 1: The app depends heavily on the bootstrap schema being fully applied

Severity: high

Symptoms when missing:

- `/api/auth/challenge` returns `500` if `nonces` is missing
- whitelist fetches `404` if `whitelist` is missing
- public artist filtering falls back or fails if status/relations are missing
- admin approval fails if artist contract columns or audit tables are missing

### Finding 2: Browser reads and backend writes are split across two authority models

Severity: medium

Impact:

- harder to reason about auth and RLS
- some flows bypass backend and depend directly on Supabase public policy shape
- some flows require secure runtime tokens and service-role-backed backend logic

### Finding 3: Commerce schema is more advanced than commerce runtime

Severity: medium

The schema supports:

- `product_assets`
- `entitlements`
- `fulfillments`
- normalized `order_items`

But the primary user flow still relies on:

- product-level preview/delivery URIs
- order status derived access
- direct order creation after onchain purchase

So the data model is ahead of the actual enforcement model.

### Finding 4: There are duplicate or overlapping audit/analytics concepts

Severity: low

Examples:

- `analytics` and `analytics_events`
- `audit_logs` and `admin_audit_log`

This is manageable, but cleanup would reduce confusion.

### Finding 5: Legacy contract paths remain in the codebase as explicit stubs

Severity: medium

This is good defensive signaling, but it confirms the contract migration is incomplete at the codebase level.

### Finding 6: Collection access is not yet fully entitlement-driven

Severity: medium

Current collection rendering mostly trusts:

- order status
- product delivery fields

More secure future state should trust:

- `entitlements`
- `product_assets`
- signed delivery resolution

### Finding 7: Admin approval is one of the most tightly coupled flows in the app

Severity: medium

It coordinates:

- secure auth
- whitelist
- artist applications
- artist profile upsert
- onchain approval
- contract deployment
- audit log writes

This is powerful, but also fragile if any env var, table, or contract address is missing.

## 14. Recommended Canonical Mental Model

If you want to reason about the app simply, the cleanest model is:

### Public catalog

- `artists`
- `drops`
- `products`

### Secure creator/admin operations

- authenticated Express API
- `whitelist`
- `artist_applications`
- `admin_audit_log`
- `nonces`

### Commerce

- `products`
- `orders`
- `order_items`
- future-canonical: `product_assets`, `entitlements`, `fulfillments`

### IP/campaigns

- `drops` for campaign-style collectible experiences
- `campaign_submissions` for participatory content
- `ip_campaigns`, `ip_investments`, `royalty_distributions` for finance-grade IP flows

### Onchain

- contracts are the execution layer
- Supabase is the indexing, UI, and operational layer

## 15. Recommended Cleanup Priorities

1. Make the fresh Supabase project fully canonical by applying [SUPABASE_SCHEMA.sql](./SUPABASE_SCHEMA.sql) before any further debugging.
2. Choose a single canonical public-read model and remove as many schema fallbacks as possible.
3. Move collection and digital delivery fully onto `product_assets` + `entitlements`.
4. Decide whether `analytics_events` fully replaces `analytics`.
5. Decide whether `admin_audit_log` fully replaces `audit_logs`.
6. Keep per-artist contracts as the only drop contract model and delete remaining legacy shared-contract assumptions.

## 16. Bootstrap Checklist For A Clean Environment

1. Apply [SUPABASE_SCHEMA.sql](./SUPABASE_SCHEMA.sql)
2. Verify core tables exist:
   - `artists`
   - `whitelist`
   - `drops`
   - `products`
   - `orders`
   - `order_items`
   - `nonces`
   - `campaign_submissions`
   - `admin_audit_log`
3. Verify secure auth:
   - `/api/auth/challenge`
   - `/api/auth/verify`
4. Verify public reads:
   - artists page
   - drops page
   - products page
5. Verify creator flow:
   - artist profile save
   - drop creation
6. Verify admin flow:
   - artist approval
7. Verify commerce flow:
   - product creation
   - onchain purchase
   - order recording
   - collection access

## 17. Files Most Important To Understand The System

If someone needs to onboard fast, these are the highest-signal files:

- [src/App.tsx](./src/App.tsx)
- [src/lib/db.ts](./src/lib/db.ts)
- [src/lib/supabaseStore.ts](./src/lib/supabaseStore.ts)
- [src/lib/secureAuth.ts](./src/lib/secureAuth.ts)
- [src/lib/pinata.ts](./src/lib/pinata.ts)
- [server/index.js](./server/index.js)
- [src/pages/ArtistStudioPage.tsx](./src/pages/ArtistStudioPage.tsx)
- [src/pages/AdminPage.tsx](./src/pages/AdminPage.tsx)
- [src/pages/CheckoutPage.tsx](./src/pages/CheckoutPage.tsx)
- [src/pages/MyCollectionPage.tsx](./src/pages/MyCollectionPage.tsx)
- [SUPABASE_SCHEMA.sql](./SUPABASE_SCHEMA.sql)

