// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PopupAuctionManager
 * @notice Extended auction management with bidding incentives and extensions
 * @dev Handles:
 *   - Auction time extensions
 *   - Bid incentives and bonuses
 *   - Reserve pricing
 *   - Bid history tracking
 */
contract PopupAuctionManager is Ownable, ReentrancyGuard {
    // ═══════════════════════════════════════════════════════════════════════════
    // TYPE DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    enum AuctionStatus {
        Active,
        Extended,
        Settled,
        Cancelled
    }

    struct AuctionSettings {
        uint256 minReservePrice;
        uint256 minBidIncrement; // bps (500 = 5%)
        uint256 extensionThreshold; // seconds before end (300 = 5 min)
        uint256 extensionDuration; // seconds to extend (300 = 5 min)
        bool allowExtension;
    }

    struct BidRecord {
        address bidder;
        uint256 amount;
        uint256 timestamp;
        string bidderHandle; // Optional: for leaderboard
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    // Auction settings
    mapping(uint256 => AuctionSettings) public auctionSettings;

    // Bid history (auctionId => array of bids)
    mapping(uint256 => BidRecord[]) public bidHistory;

    // Auction status tracking
    mapping(uint256 => AuctionStatus) public auctionStatus;
    mapping(uint256 => bool) public auctionExtended;
    mapping(uint256 => uint256) public auctionExtensionCount;

    // Bid incentives
    mapping(uint256 => uint256) public bidIncentivePool; // bonuses for engaging bidders
    uint256 public platformIncentiveShare = 1000; // 10% of bids go to incentive pool

    // Auction creator settings
    mapping(address => uint256) public creatorDefaultMinBid;
    mapping(address => uint256) public creatorDefaultExtension;

    // Authorized callers (like ProductStore)
    mapping(address => bool) public authorizedCallers;

    // Leaderboard (for engagement tracking)
    mapping(uint256 => mapping(address => uint256)) public bidderBidCount; // auction ID => bidder => count
    mapping(uint256 => address[]) public topBidders; // auction ID => sorted bidder addresses

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    event AuctionExtended(
        uint256 indexed auctionId,
        uint256 newEndTime,
        uint256 extensionCount
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 timestamp
    );

    event BidIncentiveAwarded(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionSettled(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice
    );

    event AuctionCancelled(uint256 indexed auctionId, string reason);

    event AuctionSettingsUpdated(
        uint256 indexed auctionId,
        uint256 minReserve,
        uint256 minIncrement
    );

    event AuctionBidsArchived(
        uint256 indexed auctionId,
        uint256 deletedCount,
        uint256 remainingCount
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    constructor() {}

    // ═══════════════════════════════════════════════════════════════════════════
    // AUCTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialize auction settings
     * @param auctionId Unique auction ID
     * @param minReserve Minimum reserve price
     * @param minBidIncrement Minimum bid increment in bps
     */
    function initializeAuction(
        uint256 auctionId,
        uint256 minReserve,
        uint256 minBidIncrement
    ) external {
        require(authorizedCallers[msg.sender], "Not authorized");
        require(minBidIncrement > 0 && minBidIncrement <= 1000, "Invalid increment");

        auctionSettings[auctionId] = AuctionSettings({
            minReservePrice: minReserve,
            minBidIncrement: minBidIncrement,
            extensionThreshold: 300, // 5 minutes default
            extensionDuration: 300,
            allowExtension: true
        });

        auctionStatus[auctionId] = AuctionStatus.Active;
    }

    /**
     * @notice Record a bid in the auction
     * @param auctionId Auction ID
     * @param bidder Bidder address
     * @param amount Bid amount
     */
    function recordBid(
        uint256 auctionId,
        address bidder,
        uint256 amount
    ) external {
        require(authorizedCallers[msg.sender], "Not authorized");
        require(auctionStatus[auctionId] == AuctionStatus.Active, "Auction not active");
        require(amount >= auctionSettings[auctionId].minReservePrice, "Below reserve");

        // Record bid
        bidHistory[auctionId].push(
            BidRecord({
                bidder: bidder,
                amount: amount,
                timestamp: block.timestamp,
                bidderHandle: ""
            })
        );

        // Track bidder participation
        bidderBidCount[auctionId][bidder]++;

        // Add to incentive pool
        uint256 incentive = (amount * platformIncentiveShare) / 10000;
        bidIncentivePool[auctionId] += incentive;

        emit BidPlaced(auctionId, bidder, amount, block.timestamp);
    }

    /**
     * @notice Extend auction if within threshold
     * @param auctionId Auction ID
     * @param currentEndTime Current auction end time
     * @return newEndTime New end time if extended
     */
    function maybeExtendAuction(uint256 auctionId, uint256 currentEndTime)
        external
        returns (uint256)
    {
        require(authorizedCallers[msg.sender], "Not authorized");

        AuctionSettings memory settings = auctionSettings[auctionId];
        require(settings.allowExtension, "Extensions disabled");

        uint256 timeUntilEnd = currentEndTime > block.timestamp
            ? currentEndTime - block.timestamp
            : 0;

        // Auto-extend if bid placed within threshold
        if (timeUntilEnd <= settings.extensionThreshold) {
            uint256 newEndTime = block.timestamp + settings.extensionDuration;
            auctionExtended[auctionId] = true;
            auctionExtensionCount[auctionId]++;
            auctionStatus[auctionId] = AuctionStatus.Extended;

            emit AuctionExtended(auctionId, newEndTime, auctionExtensionCount[auctionId]);
            return newEndTime;
        }

        return currentEndTime;
    }

    /**
     * @notice Award bid incentive to encourage participation
     * @param auctionId Auction ID
     * @param bidder Bidder to reward
     * @param amount Amount to award
     */
    function awardBidIncentive(
        uint256 auctionId,
        address bidder,
        uint256 amount
    ) external payable nonReentrant {
        require(authorizedCallers[msg.sender], "Not authorized");
        require(amount > 0, "Amount must be > 0");
        require(msg.value >= amount, "Insufficient value");

        (bool success, ) = payable(bidder).call{value: amount}("");
        require(success, "Transfer failed");

        emit BidIncentiveAwarded(auctionId, bidder, amount);
    }

    /**
     * @notice Settle auction
     * @param auctionId Auction ID
     * @param winner Winning bidder
     * @param finalPrice Final sale price
     * @dev Does not clear bid history to avoid unbounded loop gas costs
     *      Bid history remains queryable for transparency and auditing
     */
    function settleAuction(
        uint256 auctionId,
        address winner,
        uint256 finalPrice
    ) external {
        require(authorizedCallers[msg.sender], "Not authorized");
        require(auctionStatus[auctionId] != AuctionStatus.Settled, "Already settled");

        auctionStatus[auctionId] = AuctionStatus.Settled;
        emit AuctionSettled(auctionId, winner, finalPrice);
    }

    /**
     * @notice Archive auction bid history (optional, for gas-constrained cleanup)
     * @param auctionId Auction ID
     * @param batchSize Number of bids to clear per call (prevents unbounded loop)
     * @dev Call multiple times if bid count exceeds batchSize
     *      Emits snapshot of full history before clearing
     */
    function archiveAuctionBids(
        uint256 auctionId,
        uint256 batchSize
    ) external {
        require(msg.sender == owner(), "Only owner can archive");
        require(auctionStatus[auctionId] == AuctionStatus.Settled, "Auction not settled");
        require(batchSize > 0 && batchSize <= 100, "Invalid batch size");

        uint256 bidCount = bidHistory[auctionId].length;
        uint256 toDelete = batchSize > bidCount ? bidCount : batchSize;

        // Clear specified number of bids from the end (most efficient deletion)
        for (uint256 i = 0; i < toDelete; i++) {
            bidHistory[auctionId].pop();
        }

        // Emit event to indicate partial/full archive
        uint256 remaining = bidHistory[auctionId].length;
        emit AuctionBidsArchived(auctionId, toDelete, remaining);
    }

    /**
     * @notice Cancel auction
     */
    function cancelAuction(uint256 auctionId, string memory reason) external {
        require(authorizedCallers[msg.sender], "Not authorized");

        auctionStatus[auctionId] = AuctionStatus.Cancelled;
        emit AuctionCancelled(auctionId, reason);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AUCTION SETTINGS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Update auction extension parameters
     */
    function updateExtensionSettings(
        uint256 auctionId,
        uint256 threshold,
        uint256 duration,
        bool allow
    ) external {
        require(authorizedCallers[msg.sender], "Not authorized");
        require(threshold > 0 && duration > 0, "Invalid settings");

        auctionSettings[auctionId].extensionThreshold = threshold;
        auctionSettings[auctionId].extensionDuration = duration;
        auctionSettings[auctionId].allowExtension = allow;
    }

    /**
     * @notice Creator default auction settings
     */
    function setCreatorDefaults(
        uint256 minBid,
        uint256 extensionDuration
    ) external {
        creatorDefaultMinBid[msg.sender] = minBid;
        creatorDefaultExtension[msg.sender] = extensionDuration;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get bid history for an auction
     */
    function getBidHistory(uint256 auctionId)
        external
        view
        returns (BidRecord[] memory)
    {
        return bidHistory[auctionId];
    }

    /**
     * @notice Get highest bid for an auction
     */
    function getHighestBid(uint256 auctionId)
        external
        view
        returns (address bidder, uint256 amount)
    {
        BidRecord[] memory bids = bidHistory[auctionId];
        require(bids.length > 0, "No bids");

        BidRecord memory highest = bids[0];
        for (uint256 i = 1; i < bids.length; i++) {
            if (bids[i].amount > highest.amount) {
                highest = bids[i];
            }
        }

        return (highest.bidder, highest.amount);
    }

    /**
     * @notice Get bid count for auction
     */
    function getBidCount(uint256 auctionId) external view returns (uint256) {
        return bidHistory[auctionId].length;
    }

    /**
     * @notice Get bidder's participation in auction
     */
    function getBidderParticipation(uint256 auctionId, address bidder)
        external
        view
        returns (uint256)
    {
        return bidderBidCount[auctionId][bidder];
    }

    /**
     * @notice Get auction status
     */
    function getAuctionStatus(uint256 auctionId)
        external
        view
        returns (AuctionStatus)
    {
        return auctionStatus[auctionId];
    }

    /**
     * @notice Get auction settings
     */
    function getAuctionSettings(uint256 auctionId)
        external
        view
        returns (AuctionSettings memory)
    {
        return auctionSettings[auctionId];
    }

    /**
     * @notice Check if minimum bid increment met
     */
    function isValidBidIncrement(
        uint256 auctionId,
        uint256 currentBid,
        uint256 newBid
    ) external view returns (bool) {
        uint256 minIncrement = auctionSettings[auctionId].minBidIncrement;
        uint256 incrementAmount = (currentBid * minIncrement) / 10000;
        return newBid >= currentBid + incrementAmount;
    }

    /**
     * @notice Get incentive pool balance for auction
     */
    function getIncentivePool(uint256 auctionId) external view returns (uint256) {
        return bidIncentivePool[auctionId];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Authorize a contract caller
     */
    function authorizeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
    }

    /**
     * @notice Revoke caller authorization
     */
    function revokeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
    }

    /**
     * @notice Update platform incentive share
     */
    function setPlatformIncentiveShare(uint256 bps) external onlyOwner {
        require(bps <= 2000, "Share too high"); // Max 20%
        platformIncentiveShare = bps;
    }

    receive() external payable {}
}
