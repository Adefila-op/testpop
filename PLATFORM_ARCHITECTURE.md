# Platform Architecture

## Goal

Build PopUp as a hybrid creator platform that supports:

- Digital products: ebooks, art files, audio, video, templates, software, downloadable bundles
- Physical products: prints, merch, signed editions, made-to-order goods
- Hybrid products: physical + digital access in a single purchase
- Tokenized creative IP: campaign-based investment into productions, catalogs, or revenue streams

## System Model

The platform should be split into two product domains:

1. Commerce
- Direct creator-to-buyer sales
- Digital delivery and physical fulfillment
- Order management, shipping, entitlements, download access

2. IP Finance
- Tokenized campaigns around creative projects
- Investor onboarding, contribution tracking, rights metadata
- Royalty and payout accounting

These domains can share creator identity and product metadata, but they should not share the same purchase semantics.

## Core Entities

### `artists`
Creator identity and approval state.

Responsibilities:
- profile and social metadata
- creator approval / onboarding
- subscription state
- commerce ownership
- IP campaign ownership
- deployed creator/share contracts

### `products`
Commercial sellable units.

Responsibilities:
- storefront metadata
- pricing and stock
- product type: `digital | physical | hybrid`
- lifecycle state: `draft | published | archived | out_of_stock`
- relation to creator / artist

Important rule:
- `products` are for commerce, not for tokenized investment offerings.

### `product_assets`
Separates public preview media from private delivery media.

Responsibilities:
- asset role: `preview | delivery | source | attachment`
- visibility: `public | gated | private`
- media kind: `image | video | audio | pdf | epub | archive | software | document`
- storage metadata and integrity hashes
- download policy and signed URL requirements

Important rule:
- public catalog queries should only expose preview/public assets.
- gated delivery assets should be resolved through entitlements and backend-issued access.

### `orders` and `order_items`
Commercial purchase records.

Responsibilities:
- buyer and checkout state
- multi-item cart support
- payment verification state
- physical shipping / digital delivery readiness

### `entitlements`
Represents a buyer's right to access a digital asset or hybrid bundle after verified payment.

Responsibilities:
- ties wallet/order/order_item/product to access rights
- records grant / revoke / expiry / consumption state
- becomes the canonical source for download access

### `fulfillments`
Tracks delivery operations for both physical and digital products.

Responsibilities:
- shipping workflow for physical goods
- digital release / sent / delivered states
- carrier, tracking, warehouse, and delivery logs

### `ip_campaigns`
Tokenized creative investment campaigns.

Responsibilities:
- project/production metadata
- raise target and contribution window
- legal/compliance and risk flags
- token/share contract linkage
- funding / settlement lifecycle

### `ip_investments`
Investor position records.

Responsibilities:
- investor wallet
- amount invested
- units or rights granted
- contribution transaction history
- cap table support

### `royalty_distributions`
Payout ledger for investor/creator revenue sharing.

Responsibilities:
- campaign-level payout records
- wallet-level disbursements
- source revenue references
- settlement status and tx hashes

## Recommended Flow

### Digital Product Sale
1. Creator creates `product`
2. Creator uploads preview and delivery files into `product_assets`
3. Buyer completes verified checkout
4. Paid order grants `entitlements`
5. Backend resolves delivery assets only for entitled buyer

### Physical Product Sale
1. Creator creates `product`
2. Buyer completes verified checkout
3. `fulfillments` record is created
4. Seller/admin updates shipment and delivery lifecycle

### Hybrid Product Sale
1. Same as physical or digital checkout
2. One order creates both:
- digital `entitlements`
- physical `fulfillments`

### IP Investment Campaign
1. Creator creates `ip_campaign`
2. Compliance / legal review approves it
3. Token or shares contract is linked
4. Investors contribute through dedicated investment flow
5. `ip_investments` records cap table positions
6. `royalty_distributions` handles downstream payouts

## Security Rules

### Public data
- creator profiles
- published products
- preview assets
- active investment campaigns marked public

### Protected commerce data
- delivery assets
- download tokens
- shipping addresses
- fulfillment operations
- buyer order history

### Protected finance data
- unpublished campaigns
- investor positions
- payout ledgers
- compliance review metadata

## Contract Boundary

Use separate onchain primitives for:

- product commerce
- collectible drops
- creator subscriptions
- tokenized IP / revenue-share campaigns

Do not treat product checkout and IP investment as the same contract flow.

## Near-Term Refactor Plan

1. Stop using `delivery_uri` on public product/drop reads as the delivery source.
2. Move delivery media into `product_assets`.
3. Create `entitlements` on paid digital or hybrid orders.
4. Create `fulfillments` for physical or hybrid orders.
5. Introduce `ip_campaigns`, `ip_investments`, and `royalty_distributions`.
6. Keep the existing `artists.shares_*` fields as transitional metadata until all IP logic is moved into campaign tables.
