// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title PopupRoyaltyManager
 * @notice Manages secondary market royalties for original creators
 * @dev Tracks and pays out royalties when NFTs trade on secondary markets
 */
contract PopupRoyaltyManager is Ownable, ReentrancyGuard {
    // ═══════════════════════════════════════════════════════════════════════════
    // TYPE DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    struct RoyaltyConfig {
        address creator;
        uint256 royaltyBps; // basis points (500 = 5%)
        uint256 maxRoyaltyBps; // platform max allowed (1000 = 10%)
        bool active;
    }

    struct RoyaltyPayment {
        address payer; // secondary buyer/marketplace
        address creator;
        uint256 amount;
        uint256 tokenId;
        string marketplaceId; // opensea, blur, etc
        uint256 timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    // Product/NFT royalty settings (tokenAddress => tokenId => config)
    mapping(address => mapping(uint256 => RoyaltyConfig)) public royaltyConfigs;

    // Creator total royalties earned
    mapping(address => uint256) public creatorTotalRoyalties;

    // Creator royalty payments history
    mapping(address => RoyaltyPayment[]) public creatorRoyaltyHistory;

    // Pending royalties by creator
    mapping(address => uint256) public pendingRoyalties;

    // Creator royalty withdrawal address (can be different from creator)
    mapping(address => address) public royaltyWithdrawalAddress;

    // Platform royalty share (when collecting royalties on behalf of creators)
    uint256 public platformRoyaltyShare = 500; // 5% of royalties go to platform

    // Platform royalty address
    address public platformRoyaltyRecipient;

    // Marketplace integrations (for tracking)
    mapping(string => bool) public authorizedMarketplaces; // "opensea", "blur", etc

    // NFT contract approvals
    mapping(address => bool) public trustedNFTContracts;

    // Royalty payment tokens
    enum PaymentToken {
        ETH,
        USDC,
        USDT
    }

    mapping(PaymentToken => address) public paymentTokens;

    // Authorized callers
    mapping(address => bool) public authorizedCallers;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    event RoyaltyConfigSet(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed creator,
        uint256 royaltyBps
    );

    event RoyaltyPaid(
        address indexed creator,
        uint256 amount,
        uint256 indexed tokenId,
        string marketplaceId
    );

    event RoyaltyPending(
        address indexed creator,
        uint256 amount,
        string reason
    );

    event RoyaltyWithdrawn(
        address indexed creator,
        uint256 amount,
        PaymentToken token
    );

    event MarketplaceAuthorized(string marketplaceId, bool authorized);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    constructor(
        address _usdc,
        address _usdt,
        address _platformRecipient
    ) {
        paymentTokens[PaymentToken.USDC] = _usdc;
        paymentTokens[PaymentToken.USDT] = _usdt;
        platformRoyaltyRecipient = _platformRecipient;

        // Pre-authorize OpenSea, Blur
        authorizedMarketplaces["opensea"] = true;
        authorizedMarketplaces["blur"] = true;
        authorizedMarketplaces["looksrare"] = true;
        authorizedMarketplaces["x2y2"] = true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ROYALTY CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Set royalty configuration for an NFT
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param creator Creator address for royalties
     * @param royaltyBps Royalty percentage in basis points
     */
    function setRoyaltyConfig(
        address nftContract,
        uint256 tokenId,
        address creator,
        uint256 royaltyBps
    ) external {
        require(authorizedCallers[msg.sender], "Not authorized");
        require(creator != address(0), "Invalid creator");
        require(royaltyBps > 0 && royaltyBps <= 1000, "Invalid royalty bps");

        royaltyConfigs[nftContract][tokenId] = RoyaltyConfig({
            creator: creator,
            royaltyBps: royaltyBps,
            maxRoyaltyBps: 1000,
            active: true
        });

        emit RoyaltyConfigSet(nftContract, tokenId, creator, royaltyBps);
    }

    /**
     * @notice Get royalty configuration for an NFT
     */
    function getRoyaltyConfig(address nftContract, uint256 tokenId)
        external
        view
        returns (RoyaltyConfig memory)
    {
        return royaltyConfigs[nftContract][tokenId];
    }

    /**
     * @notice Disable royalties for a token
     */
    function disableRoyalties(address nftContract, uint256 tokenId) external {
        require(authorizedCallers[msg.sender], "Not authorized");
        royaltyConfigs[nftContract][tokenId].active = false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ROYALTY PAYMENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Record a royalty payment (called by marketplace integration)
     * @param nftContract NFT contract
     * @param tokenId Token ID being traded
     * @param salePrice Sale price
     * @param marketplaceId Marketplace identifier
     */
    function recordRoyaltyPayment(
        address nftContract,
        uint256 tokenId,
        uint256 salePrice,
        string memory marketplaceId
    ) external payable nonReentrant {
        require(authorizedMarketplaces[marketplaceId], "Marketplace not authorized");

        RoyaltyConfig memory config = royaltyConfigs[nftContract][tokenId];
        require(config.active, "Royalties disabled for this NFT");
        require(config.creator != address(0), "No creator set");

        // Calculate royalty amount
        uint256 royaltyAmount = (salePrice * config.royaltyBps) / 10000;
        require(msg.value >= royaltyAmount, "Insufficient payment");

        address creatorAddress = config.creator;

        // Split with platform
        uint256 platformShare = (royaltyAmount * platformRoyaltyShare) / 10000;
        uint256 creatorShare = royaltyAmount - platformShare;

        // Send platform share
        if (platformShare > 0) {
            (bool success, ) = payable(platformRoyaltyRecipient).call{value: platformShare}("");
            require(success, "Platform payment failed");
        }

        // Add to creator's pending
        pendingRoyalties[creatorAddress] += creatorShare;

        // Record payment
        creatorRoyaltyHistory[creatorAddress].push(
            RoyaltyPayment({
                payer: msg.sender,
                creator: creatorAddress,
                amount: creatorShare,
                tokenId: tokenId,
                marketplaceId: marketplaceId,
                timestamp: block.timestamp
            })
        );

        // Update totals
        creatorTotalRoyalties[creatorAddress] += creatorShare;

        emit RoyaltyPaid(creatorAddress, creatorShare, tokenId, marketplaceId);
    }

    /**
     * @notice Claim pending royalties
     * @param token Payment token (ETH, USDC, USDT)
     */
    function claimRoyalties(PaymentToken token) external nonReentrant {
        uint256 amount = pendingRoyalties[msg.sender];
        require(amount > 0, "No pending royalties");

        pendingRoyalties[msg.sender] = 0;

        address recipient = royaltyWithdrawalAddress[msg.sender] != address(0)
            ? royaltyWithdrawalAddress[msg.sender]
            : msg.sender;

        if (token == PaymentToken.ETH) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else if (token == PaymentToken.USDC || token == PaymentToken.USDT) {
            address tokenAddress = paymentTokens[token];
            require(tokenAddress != address(0), "Token not enabled");
            bool success = IERC20(tokenAddress).transfer(recipient, amount);
            require(success, "Token transfer failed");
        }

        emit RoyaltyWithdrawn(msg.sender, amount, token);
    }

    /**
     * @notice Set withdrawal address for royalties
     */
    function setRoyaltyWithdrawalAddress(address withdrawalAddress) external {
        require(withdrawalAddress != address(0), "Invalid address");
        royaltyWithdrawalAddress[msg.sender] = withdrawalAddress;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QUERY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get creator's pending royalties
     */
    function getPendingRoyalties(address creator) external view returns (uint256) {
        return pendingRoyalties[creator];
    }

    /**
     * @notice Get creator's total royalties earned
     */
    function getTotalRoyalties(address creator) external view returns (uint256) {
        return creatorTotalRoyalties[creator];
    }

    /**
     * @notice Get royalty payment history for creator
     */
    function getRoyaltyHistory(address creator)
        external
        view
        returns (RoyaltyPayment[] memory)
    {
        return creatorRoyaltyHistory[creator];
    }

    /**
     * @notice Calculate royalty for a sale price
     */
    function calculateRoyalty(
        address nftContract,
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (uint256 creatorShare, uint256 platformShare) {
        RoyaltyConfig memory config = royaltyConfigs[nftContract][tokenId];
        if (!config.active) return (0, 0);

        uint256 total = (salePrice * config.royaltyBps) / 10000;
        platformShare = (total * platformRoyaltyShare) / 10000;
        creatorShare = total - platformShare;
    }

    /**
     * @notice Get royalty history count
     */
    function getRoyaltyHistoryCount(address creator)
        external
        view
        returns (uint256)
    {
        return creatorRoyaltyHistory[creator].length;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Authorize a marketplace
     */
    function authorizeMarketplace(string memory marketplaceId, bool authorized)
        external
        onlyOwner
    {
        authorizedMarketplaces[marketplaceId] = authorized;
        emit MarketplaceAuthorized(marketplaceId, authorized);
    }

    /**
     * @notice Authorize a contract caller
     */
    function authorizeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
    }

    /**
     * @notice Revoke caller
     */
    function revokeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
    }

    /**
     * @notice Update platform royalty share
     */
    function setPlatformRoyaltyShare(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Share too high"); // Max 10%
        platformRoyaltyShare = bps;
    }

    /**
     * @notice Update platform royalty recipient
     */
    function setPlatformRoyaltyRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        platformRoyaltyRecipient = recipient;
    }

    /**
     * @notice Authorize NFT contract
     */
    function trustNFTContract(address nftContract) external onlyOwner {
        trustedNFTContracts[nftContract] = true;
    }

    /**
     * @notice Revoke NFT contract trust
     */
    function untrustNFTContract(address nftContract) external onlyOwner {
        trustedNFTContracts[nftContract] = false;
    }

    receive() external payable {}
}
