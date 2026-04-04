export type DropInteractionMode =
  | "collect"
  | "checkout"
  | "campaign"
  | "auction"
  | "unsupported";

type DropBehaviorInput = {
  type: "drop" | "auction" | "campaign";
  contractKind?: "artDrop" | "poapCampaign" | "poapCampaignV2" | "creativeReleaseEscrow" | "productStore" | null;
};

type LinkedProductBehaviorInput = {
  id?: string | null;
  contract_kind?: "artDrop" | "productStore" | "creativeReleaseEscrow" | null;
  contract_listing_id?: number | null;
  contract_product_id?: number | null;
};

export type ResolvedDropBehavior = {
  mode: DropInteractionMode;
  isReleaseBacked: boolean;
  isOnchainReady: boolean;
};

function hasPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function resolveDropBehavior(params: {
  drop: DropBehaviorInput;
  linkedProduct?: LinkedProductBehaviorInput | null;
  sourceKind?: string | null;
}): ResolvedDropBehavior {
  const { drop, linkedProduct, sourceKind } = params;
  const inferredContractKind =
    linkedProduct?.contract_kind || drop.contractKind || null;
  const isReleaseBacked =
    sourceKind === "release_product" ||
    sourceKind === "catalog_product" ||
    inferredContractKind === "creativeReleaseEscrow" ||
    inferredContractKind === "productStore" ||
    Boolean(linkedProduct?.id);

  if (drop.type === "campaign") {
    return {
      mode: "campaign",
      isReleaseBacked,
      isOnchainReady: true,
    };
  }

  if (drop.type === "auction" && drop.contractKind === "poapCampaign") {
    return {
      mode: "auction",
      isReleaseBacked: false,
      isOnchainReady: true,
    };
  }

  if (isReleaseBacked) {
    const isOnchainReady =
      inferredContractKind === "creativeReleaseEscrow"
        ? hasPositiveNumber(linkedProduct?.contract_listing_id)
        : hasPositiveNumber(linkedProduct?.contract_product_id);

    return {
      mode: "checkout",
      isReleaseBacked: true,
      isOnchainReady,
    };
  }

  if (drop.type === "drop" && drop.contractKind === "artDrop") {
    return {
      mode: "collect",
      isReleaseBacked: false,
      isOnchainReady: true,
    };
  }

  return {
    mode: "unsupported",
    isReleaseBacked,
    isOnchainReady: false,
  };
}
