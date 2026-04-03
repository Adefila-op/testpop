# General Schema

This is the high-level schema for the current POPUP app.

`SUPABASE_SCHEMA.sql` is the executable bootstrap file.
This document is the readable overview.

## Core Identity

### `artists`
- Primary creator profile table
- Stores wallet, name, handle, bio, tag, social links, avatar/banner, portfolio
- Also stores contract deployment and shares/campaign state

### `whitelist`
- Artist application approval state
- Links wallet status to review flow
- Can reference `artists.id`

### `artist_applications`
- Stores creator applications and review data
- Used before or alongside whitelist approval

## Drops And Products

### `drops`
- Main drop catalog for art releases
- Belongs to `artists`
- Stores title, description, price, supply, sold count, media URIs, metadata, contract linkage, status

### `products`
- Store/commerce catalog
- Can belong to an artist through `artist_id`
- Supports physical, digital, and hybrid product types

### `product_assets`
- Asset records for a product
- Supports preview assets and gated delivery assets
- Used for files like image, video, audio, pdf, epub, archives, and documents

## Orders And Access

### `orders`
- Checkout/order header table
- Stores buyer wallet, totals, shipping, payment state, tracking, timestamps

### `order_items`
- Line items for multi-product checkout
- Belongs to `orders`
- References `products`

### `entitlements`
- Access grants for digital ownership
- Connects buyer wallet to purchased digital assets
- Used for download, stream, reader, or license access

### `fulfillments`
- Post-purchase fulfillment state
- Handles physical and digital delivery workflows

## Analytics

### `analytics`
- Legacy analytics table
- Older page/event tracking

### `analytics_events`
- Current event tracking table
- Stores page views, drop views, product views, checkout events, mint events, subscription events

### `artist_daily_metrics`
- Aggregated artist metrics by day
- Refreshed from analytics and order activity

## Auth And Admin

### `nonces`
- Wallet sign-in challenge storage
- Used by `/api/auth/challenge` and `/api/auth/verify`

### `admin_audit_log`
- Admin action log
- Tracks whitelist and moderation actions

## Community And Growth

### `waitlist`
- General product/community waitlist
- Separate from artist whitelist flow

### `campaign_submissions`
- Submission table for campaign participation flows

## IP And Investment

### `ip_campaigns`
- Creative IP fundraising / revenue-share campaign table
- Belongs to `artists`

### `ip_investments`
- Investor participation records for `ip_campaigns`

### `royalty_distributions`
- Royalty payout records tied to campaigns and investments

## Main Relationships

- `artists.id -> drops.artist_id`
- `artists.id -> products.artist_id`
- `artists.id -> whitelist.artist_id`
- `artists.id -> ip_campaigns.artist_id`
- `orders.id -> order_items.order_id`
- `products.id -> order_items.product_id`
- `products.id -> product_assets.product_id`
- `orders.id -> entitlements.order_id`
- `order_items.id -> entitlements.order_item_id`
- `products.id -> entitlements.product_id`
- `product_assets.id -> entitlements.asset_id`
- `orders.id -> fulfillments.order_id`
- `order_items.id -> fulfillments.order_item_id`
- `products.id -> fulfillments.product_id`
- `ip_campaigns.id -> ip_investments.campaign_id`
- `ip_campaigns.id -> royalty_distributions.campaign_id`

## Important App Dependencies

- Admin auth depends on `nonces`
- Admin review tools depend on `whitelist`, `artist_applications`, and `admin_audit_log`
- Home, artists, and drops pages depend on `artists` and `drops`
- Shop and checkout depend on `products`, `orders`, and `order_items`
- Digital delivery depends on `product_assets`, `entitlements`, and `fulfillments`
- IP finance flows depend on `ip_campaigns`, `ip_investments`, and `royalty_distributions`

## Recommended Bootstrap Order

1. Run `SUPABASE_SCHEMA.sql`
2. Confirm these tables exist:
   `artists`, `whitelist`, `drops`, `products`, `orders`, `order_items`, `nonces`
3. Confirm auth challenge works at `/api/auth/challenge`
4. Confirm whitelist queries no longer return `404`
5. Test artist deck, drops, admin, and checkout
