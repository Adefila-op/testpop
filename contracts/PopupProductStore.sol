// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PopupProductStore
 * @notice Unified smart contract for POPUP Platform Products/Drops
 * @dev Handles:
 *   - Product collection with automatic NFT minting
 *   - Gifting with recipient acceptance/rejection
 *   - English auctions with bidding
 *   - Multi-payment support (ETH, USDC, USDT)
 *   - Creator royalties and payouts
 */

interface IPayout {
    function distributePayout(
        address creator,
        uint256 amount,
        string memory reason
    ) external;
}

contract PopupProductStore is ERC1155, ERC721, Ownable, ReentrancyGuard, Pausable {
    using Strings for uint256;

    // ═══════════════════════════════════════════════════════════════════════════
    // TYPE DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    enum PaymentMethod {
        ETH,
        USDC,
        USDT
    }

    enum AuctionStatus {
        ACTIVE,
        SETTLED,
        CANCELLED
    }

    enum GiftStatus {
        PENDING,
        ACCEPTED,
        REJECTED,
        CLAIMED
    }

    struct Product {
        uint256 productId;
        address creator;
        string uri; // IPFS metadata URI
        uint256 priceWei;
        PaymentMethod paymentMethod;
        uint256 supply; // max copies (0 = unlimited)
        uint256 sold; // copies sold
        uint256 royaltyPercentBps; // basis points (250 = 2.5%)
        bool paused;
        uint256 createdAt;
    }

    struct Purchase {
        uint256 purchaseId;
        uint256 productId;
        address buyer;
        address creator;
        uint256 amount;
        PaymentMethod paymentMethod;
        uint256 nftTokenId;
        bool isGift;
        address giftRecipient;
        GiftStatus giftStatus;
        uint256 timestamp;
    }

    struct Auction {
        uint256 auctionId;
        uint256 productId;
        address creator;
        uint256 startPrice;
        address highestBidder;
        uint256 highestBid;
        uint256 startTime;
        uint256 endTime;
        AuctionStatus status;
        bytes32 ipfsMetadataHash;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    struct GiftClaim {
        address recipient;
        uint256 purchaseId;
        string recipientLabel; // for privacy (email, handle, etc)
        GiftStatus status;
        string claimCode; // TODO: implement claim verification
        uint256 createdAt;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    // Product management
    mapping(uint256 => Product) public products;
    uint256 public productCounter;

    // Purchase tracking
    mapping(uint256 => Purchase) public purchases;
    uint256 public purchaseCounter;

    // Auction system
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => Bid[]) public auctionBids;
    mapping(uint256 => mapping(address => uint256)) public auctionBidsPerBidder;
    uint256 public auctionCounter;

    // Gift system
    mapping(uint256 => GiftClaim) public giftClaims;
    mapping(address => uint256[]) public userGifts;

    // NFT tracking
    uint256 private tokenIdCounter;
    mapping(uint256 => uint256) public tokenIdToProductId; // NFT tokenId → productId
    mapping(uint256 => uint256) public tokenIdToPurchaseId; // NFT tokenId → purchaseId

    // Payment tokens
    mapping(PaymentMethod => address) public paymentTokens;

    // Payout handler
    IPayout public payoutHandler;

    // Creator registry
    mapping(address => bool) public creatorApproved;
    mapping(address => uint256) public creatorEarnings;

    // Auction configuration
    uint256 public minAuctionDuration = 1 days;
    uint256 public maxAuctionDuration = 30 days;

    // Platform fees
    uint256 public platformFeeBps = 250; // 2.5%
    address public platformFeeRecipient;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    event ProductCreated(
        uint256 indexed productId,
        address indexed creator,
        string uri,
        uint256 price,
        PaymentMethod paymentMethod
    );

    event ProductPurchased(
        uint256 indexed purchaseId,
        uint256 indexed productId,
        address indexed buyer,
        uint256 amount,
        uint256 nftTokenId,
        bool isGift
    );

    event GiftCreated(
        uint256 indexed purchaseId,
        address indexed sender,
        address indexed recipient,
        string recipientLabel
    );

    event GiftClaimed(
        uint256 indexed purchaseId,
        address indexed recipient,
        GiftStatus status
    );

    event AuctionCreated(
        uint256 indexed auctionId,
        uint256 indexed productId,
        uint256 startPrice,
        uint256 duration
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 bidCount
    );

    event AuctionSettled(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice,
        uint256 nftTokenId
    );

    event CreatorApproved(address indexed creator);
    event CreatorRevoked(address indexed creator);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR & INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    constructor(
        address _paymentTokenUsdc,
        address _paymentTokenUsdt,
        address _payoutHandler,
        address _platformFeeRecipient
    )
        ERC1155("ipfs://QmPopupProductMetadata/{id}")
        ERC721("POPUP Products", "POPUP")
    {
        paymentTokens[PaymentMethod.USDC] = _paymentTokenUsdc;
        paymentTokens[PaymentMethod.USDT] = _paymentTokenUsdt;
        payoutHandler = IPayout(_payoutHandler);
        platformFeeRecipient = _platformFeeRecipient;
        tokenIdCounter = 1;
        productCounter = 1;
        purchaseCounter = 1;
        auctionCounter = 1;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRODUCT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Create a new product listing
     * @param uri IPFS metadata URI
     * @param priceWei Price in wei (or token units)
     * @param paymentMethod Payment method (ETH, USDC, USDT)
     * @param supply Max supply (0 = unlimited)
     * @param royaltyPercentBps Creator royalty in basis points
     */
    function createProduct(
        string memory uri,
        uint256 priceWei,
        PaymentMethod paymentMethod,
        uint256 supply,
        uint256 royaltyPercentBps
    ) external returns (uint256 productId) {
        require(creatorApproved[msg.sender], "Creator not approved");
        require(priceWei > 0, "Price must be > 0");
        require(royaltyPercentBps <= 10000, "Royalty too high");

        productId = productCounter++;

        products[productId] = Product({
            productId: productId,
            creator: msg.sender,
            uri: uri,
            priceWei: priceWei,
            paymentMethod: paymentMethod,
            supply: supply,
            sold: 0,
            royaltyPercentBps: royaltyPercentBps,
            paused: false,
            createdAt: block.timestamp
        });

        emit ProductCreated(productId, msg.sender, uri, priceWei, paymentMethod);
    }

    /**
     * @notice Purchase a product directly
     * @param productId Product ID to purchase
     * @param quantity Number of copies
     * @param giftRecipient Address of gift recipient (0x0 = not a gift)
     */
    function purchaseProduct(
        uint256 productId,
        uint256 quantity,
        address giftRecipient
    ) external payable nonReentrant whenNotPaused returns (uint256 purchaseId) {
        require(quantity > 0, "Quantity must be > 0");

        Product storage product = products[productId];
        require(product.creator != address(0), "Product not found");
        require(!product.paused, "Product paused");
        require(product.supply == 0 || product.sold + quantity <= product.supply, "Insufficient supply");

        uint256 totalCost = product.priceWei * quantity;

        // Handle payment
        _processPayment(product.paymentMethod, product.creator, totalCost, false);

        // Update product state
        product.sold += quantity;

        // Create purchase record & mint NFT
        purchaseId = purchaseCounter++;
        uint256 nftTokenId = _mintProductNFT(productId, msg.sender);

        purchases[purchaseId] = Purchase({
            purchaseId: purchaseId,
            productId: productId,
            buyer: msg.sender,
            creator: product.creator,
            amount: totalCost,
            paymentMethod: product.paymentMethod,
            nftTokenId: nftTokenId,
            isGift: giftRecipient != address(0),
            giftRecipient: giftRecipient,
            giftStatus: giftRecipient != address(0) ? GiftStatus.PENDING : GiftStatus.CLAIMED,
            timestamp: block.timestamp
        });

        emit ProductPurchased(purchaseId, productId, msg.sender, totalCost, nftTokenId, giftRecipient != address(0));

        // Handle gift if present
        if (giftRecipient != address(0)) {
            _createGift(purchaseId, msg.sender, giftRecipient, "");
        }

        return purchaseId;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AUCTION SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Create an auction for a product
     * @param productId Product to auction
     * @param startPrice Starting bid price
     * @param durationSeconds Auction duration
     */
    function createAuction(
        uint256 productId,
        uint256 startPrice,
        uint256 durationSeconds
    ) external returns (uint256 auctionId) {
        require(creatorApproved[msg.sender], "Creator not approved");
        require(durationSeconds >= minAuctionDuration && durationSeconds <= maxAuctionDuration, "Invalid duration");

        Product storage product = products[productId];
        require(product.creator == msg.sender, "Not product creator");
        require(!product.paused, "Product paused");

        auctionId = auctionCounter++;

        auctions[auctionId] = Auction({
            auctionId: auctionId,
            productId: productId,
            creator: msg.sender,
            startPrice: startPrice,
            highestBidder: address(0),
            highestBid: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + durationSeconds,
            status: AuctionStatus.ACTIVE,
            ipfsMetadataHash: keccak256(abi.encodePacked(product.uri))
        });

        emit AuctionCreated(auctionId, productId, startPrice, durationSeconds);
    }

    /**
     * @notice Place a bid on an auction
     * @param auctionId Auction ID
     * @param bidAmount Bid amount in wei
     */
    function placeBid(uint256 auctionId, uint256 bidAmount)
        external
        payable
        nonReentrant
        returns (uint256 bidIndex)
    {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(bidAmount > auction.highestBid, "Bid too low");
        require(bidAmount >= auction.startPrice, "Below start price");

        // Refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            _refundBid(auction.highestBidder, auction.highestBid, auction.productId);
        }

        // Process payment for new bid
        Product storage product = products[auction.productId];
        _processPayment(product.paymentMethod, address(this), bidAmount, true);

        // Update auction state
        auction.highestBidder = msg.sender;
        auction.highestBid = bidAmount;
        auctionBidsPerBidder[auctionId][msg.sender] = bidAmount;

        // Record bid
        bidIndex = auctionBids[auctionId].length;
        auctionBids[auctionId].push(Bid({
            bidder: msg.sender,
            amount: bidAmount,
            timestamp: block.timestamp
        }));

        emit BidPlaced(auctionId, msg.sender, bidAmount, bidIndex + 1);
    }

    /**
     * @notice Settle auction and award to highest bidder
     * @param auctionId Auction to settle
     */
    function settleAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended");

        auction.status = AuctionStatus.SETTLED;

        // If no bids, return
        if (auction.highestBidder == address(0)) {
            return;
        }

        // Award to highest bidder
        uint256 nftTokenId = _mintProductNFT(auction.productId, auction.highestBidder);

        _distributePayout(
            auction.creator,
            auction.highestBid,
            products[auction.productId].royaltyPercentBps,
            "Auction settlement"
        );

        emit AuctionSettled(auctionId, auction.highestBidder, auction.highestBid, nftTokenId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GIFTING SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Create a gift from a purchase
     * @param purchaseId Purchase ID to gift
     * @param sender Sender address
     * @param recipient Recipient address
     * @param recipientLabel Privacy label (email hash, username, etc)
     */
    function createGift(
        uint256 purchaseId,
        address sender,
        address recipient,
        string memory recipientLabel
    ) external {
        require(msg.sender == sender || msg.sender == owner(), "Not authorized");
        _createGift(purchaseId, sender, recipient, recipientLabel);
    }

    /**
     * @notice Accept a gift
     * @param purchaseId Purchase ID
     */
    function acceptGift(uint256 purchaseId) external {
        Purchase storage purchase = purchases[purchaseId];
        require(purchase.giftRecipient == msg.sender, "Not gift recipient");
        require(purchase.giftStatus == GiftStatus.PENDING, "Gift not pending");

        purchase.giftStatus = GiftStatus.ACCEPTED;

        GiftClaim storage gift = giftClaims[purchaseId];
        gift.status = GiftStatus.ACCEPTED;

        emit GiftClaimed(purchaseId, msg.sender, GiftStatus.ACCEPTED);
    }

    /**
     * @notice Reject a gift
     * @param purchaseId Purchase ID
     */
    function rejectGift(uint256 purchaseId) external {
        Purchase storage purchase = purchases[purchaseId];
        require(purchase.giftRecipient == msg.sender, "Not gift recipient");
        require(purchase.giftStatus == GiftStatus.PENDING, "Gift not pending");

        purchase.giftStatus = GiftStatus.REJECTED;

        GiftClaim storage gift = giftClaims[purchaseId];
        gift.status = GiftStatus.REJECTED;

        // Refund sender
        _refundPurchase(purchaseId);

        emit GiftClaimed(purchaseId, msg.sender, GiftStatus.REJECTED);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Mint NFT for product purchase
     */
    function _mintProductNFT(uint256 productId, address to) internal returns (uint256 tokenId) {
        tokenId = tokenIdCounter++;
        tokenIdToProductId[tokenId] = productId;
        tokenIdToPurchaseId[tokenId] = purchaseCounter;

        // Mint ERC721 variant for unique products
        _safeMint(to, tokenId);
    }

    /**
     * @notice Process payment (ETH, USDC, USDT)
     */
    function _processPayment(
        PaymentMethod method,
        address recipient,
        uint256 amount,
        bool isAuctionBid
    ) internal {
        if (method == PaymentMethod.ETH) {
            require(msg.value >= amount, "Insufficient ETH");
            if (!isAuctionBid) {
                (bool success, ) = payable(recipient).call{value: amount}("");
                require(success, "ETH transfer failed");
            }
        } else if (method == PaymentMethod.USDC || method == PaymentMethod.USDT) {
            address token = paymentTokens[method];
            require(token != address(0), "Payment token not configured");
            bool success = IERC20(token).transferFrom(msg.sender, recipient, amount);
            require(success, "Token transfer failed");
        } else {
            revert("Invalid payment method");
        }
    }

    /**
     * @notice Distribute payout to creator with royalties and platform fees
     */
    function _distributePayout(
        address creator,
        uint256 amount,
        uint256 royaltyBps,
        string memory reason
    ) internal {
        // Calculate platform fee
        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 creatorShare = amount - platformFee;

        // Send platform fee
        if (platformFeeRecipient != address(0)) {
            (bool success, ) = payable(platformFeeRecipient).call{value: platformFee}("");
            require(success, "Platform fee transfer failed");
        }

        // Send to payout handler
        if (payoutHandler != address(0)) {
            payoutHandler.distributePayout(creator, creatorShare, reason);
        } else {
            (bool success, ) = payable(creator).call{value: creatorShare}("");
            require(success, "Creator payout failed");
        }

        creatorEarnings[creator] += creatorShare;
    }

    /**
     * @notice Refund a bid
     */
    function _refundBid(
        address bidder,
        uint256 amount,
        uint256 productId
    ) internal {
        Product storage product = products[productId];

        if (product.paymentMethod == PaymentMethod.ETH) {
            (bool success, ) = payable(bidder).call{value: amount}("");
            require(success, "Refund failed");
        } else {
            address token = paymentTokens[product.paymentMethod];
            bool success = IERC20(token).transfer(bidder, amount);
            require(success, "Token refund failed");
        }
    }

    /**
     * @notice Refund a purchase (for rejected gifts)
     */
    function _refundPurchase(uint256 purchaseId) internal {
        Purchase storage purchase = purchases[purchaseId];
        require(purchase.isGift, "Not a gift");

        if (purchase.paymentMethod == PaymentMethod.ETH) {
            (bool success, ) = payable(purchase.buyer).call{value: purchase.amount}("");
            require(success, "Refund failed");
        } else {
            address token = paymentTokens[purchase.paymentMethod];
            bool success = IERC20(token).transfer(purchase.buyer, purchase.amount);
            require(success, "Token refund failed");
        }
    }

    /**
     * @notice Create gift record
     */
    function _createGift(
        uint256 purchaseId,
        address sender,
        address recipient,
        string memory recipientLabel
    ) internal {
        Purchase storage purchase = purchases[purchaseId];
        purchase.isGift = true;
        purchase.giftRecipient = recipient;
        purchase.giftStatus = GiftStatus.PENDING;

        giftClaims[purchaseId] = GiftClaim({
            recipient: recipient,
            purchaseId: purchaseId,
            recipientLabel: recipientLabel,
            status: GiftStatus.PENDING,
            claimCode: "",
            createdAt: block.timestamp
        });

        userGifts[recipient].push(purchaseId);

        emit GiftCreated(purchaseId, sender, recipient, recipientLabel);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Approve a creator
     */
    function approveCreator(address creator) external onlyOwner {
        creatorApproved[creator] = true;
        emit CreatorApproved(creator);
    }

    /**
     * @notice Revoke creator approval
     */
    function revokeCreator(address creator) external onlyOwner {
        creatorApproved[creator] = false;
        emit CreatorRevoked(creator);
    }

    /**
     * @notice Pause/unpause contract
     */
    function togglePause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }

    /**
     * @notice Pause a product
     */
    function pauseProduct(uint256 productId) external {
        Product storage product = products[productId];
        require(product.creator == msg.sender || msg.sender == owner(), "Not authorized");
        product.paused = true;
    }

    /**
     * @notice Update platform fee
     */
    function setPlatformFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = feeBps;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get product details
     */
    function getProduct(uint256 productId) external view returns (Product memory) {
        return products[productId];
    }

    /**
     * @notice Get purchase details
     */
    function getPurchase(uint256 purchaseId) external view returns (Purchase memory) {
        return purchases[purchaseId];
    }

    /**
     * @notice Get auction details
     */
    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }

    /**
     * @notice Get all bids for auction
     */
    function getAuctionBids(uint256 auctionId) external view returns (Bid[] memory) {
        return auctionBids[auctionId];
    }

    /**
     * @notice Get gifts for recipient
     */
    function getUserGifts(address user) external view returns (uint256[] memory) {
        return userGifts[user];
    }

    /**
     * @notice Get creator earnings
     */
    function getCreatorEarnings(address creator) external view returns (uint256) {
        return creatorEarnings[creator];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ERC721/ERC1155 OVERRIDES
    // ═══════════════════════════════════════════════════════════════════════════

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC1155) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        uint256 productId = tokenIdToProductId[tokenId];
        Product memory product = products[productId];
        return product.uri;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return tokenURI(tokenId);
    }

    // Required overrides for dual inheritance
    function _ownerOf(uint256 tokenId) internal view returns (address) {
        return ERC721._ownerOf(tokenId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721) {
        super._increaseBalance(account, value);
    }

    receive() external payable {}
}
