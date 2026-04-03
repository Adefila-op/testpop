const normalizeCatalogStatus = (status?: string | null) => status?.trim().toLowerCase() || "";

export const PUBLIC_PRODUCT_STATUSES = ["published", "active"] as const;
export const LIVE_DROP_STATUSES = ["live", "active", "published"] as const;
export const UPCOMING_DROP_STATUSES = ["upcoming", "pending"] as const;

export function isPublicProductStatus(status?: string | null) {
  const normalizedStatus = normalizeCatalogStatus(status);
  return PUBLIC_PRODUCT_STATUSES.includes(
    normalizedStatus as (typeof PUBLIC_PRODUCT_STATUSES)[number]
  );
}

export function normalizePublicDropStatus(status?: string | null): "live" | "upcoming" | "draft" | "ended" {
  const normalizedStatus = normalizeCatalogStatus(status);

  if (
    LIVE_DROP_STATUSES.includes(
      normalizedStatus as (typeof LIVE_DROP_STATUSES)[number]
    )
  ) {
    return "live";
  }

  if (
    UPCOMING_DROP_STATUSES.includes(
      normalizedStatus as (typeof UPCOMING_DROP_STATUSES)[number]
    )
  ) {
    return "upcoming";
  }

  if (
    normalizedStatus === "draft"
  ) {
    return "draft";
  }

  return "ended";
}

export function toAdminProductStatus(
  status?: string | null
): "active" | "draft" | "out_of_stock" {
  if (isPublicProductStatus(status)) {
    return "active";
  }

  return status === "out_of_stock" ? "out_of_stock" : "draft";
}
