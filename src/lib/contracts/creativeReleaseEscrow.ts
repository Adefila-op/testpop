const DEFAULT_CREATIVE_RELEASE_ESCROW_ADDRESS = "0x0000000000000000000000000000000000000000";

export const CREATIVE_RELEASE_ESCROW_ADDRESS = (
  import.meta.env.VITE_CREATIVE_RELEASE_ESCROW_ADDRESS?.trim() ||
  DEFAULT_CREATIVE_RELEASE_ESCROW_ADDRESS
) as `0x${string}`;

export const CREATIVE_RELEASE_ESCROW_ABI = [
  {
    type: "function",
    name: "createReleaseListing",
    inputs: [
      { name: "artist", type: "address" },
      { name: "metadataURI", type: "string" },
      { name: "unitPrice", type: "uint256" },
      { name: "supply", type: "uint256" },
      { name: "adminWallet", type: "address" },
      { name: "payoutBps", type: "uint256" },
    ],
    outputs: [{ name: "listingId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "buyRelease",
    inputs: [
      { name: "listingId", type: "uint256" },
      { name: "quantity", type: "uint256" },
      { name: "orderMetadata", type: "string" },
    ],
    outputs: [{ name: "orderId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "approveOrder",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "releaseOrder",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refundOrder",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimCreatorBalance",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimBuyerRefund",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "listings",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "artist", type: "address" },
      { name: "metadataURI", type: "string" },
      { name: "unitPrice", type: "uint256" },
      { name: "supply", type: "uint256" },
      { name: "sold", type: "uint256" },
      { name: "adminWallet", type: "address" },
      { name: "payoutBps", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "createdAt", type: "uint64" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ReleaseListingCreated",
    inputs: [
      { name: "listingId", type: "uint256", indexed: true },
      { name: "artist", type: "address", indexed: true },
      { name: "adminWallet", type: "address", indexed: true },
      { name: "unitPrice", type: "uint256", indexed: false },
      { name: "supply", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ReleasePurchased",
    inputs: [
      { name: "orderId", type: "uint256", indexed: true },
      { name: "listingId", type: "uint256", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "quantity", type: "uint256", indexed: false },
      { name: "totalPrice", type: "uint256", indexed: false },
    ],
  },
] as const;
