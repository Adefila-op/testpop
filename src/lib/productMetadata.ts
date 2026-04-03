type ProductMetadataValue = Record<string, unknown> | null | undefined;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function extractContractProductId(metadata: ProductMetadataValue): number | null {
  const parsed = toFiniteNumber(metadata?.contract_product_id);
  if (parsed === null) return null;

  const normalized = Math.floor(parsed);
  return normalized >= 1 ? normalized : null;
}

export function resolveContractProductId(
  metadata: ProductMetadataValue,
  contractProductId?: number | string | null
) {
  const columnValue = toFiniteNumber(contractProductId);
  if (columnValue !== null) {
    const normalized = Math.floor(columnValue);
    if (normalized >= 1) {
      return normalized;
    }
  }

  return extractContractProductId(metadata);
}

export function extractProductMetadataUri(metadata: ProductMetadataValue): string | null {
  const value = metadata?.metadata_uri;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveProductMetadataUri(
  metadata: ProductMetadataValue,
  metadataUri?: string | null
) {
  if (typeof metadataUri === "string" && metadataUri.trim()) {
    return metadataUri.trim();
  }

  return extractProductMetadataUri(metadata);
}

export function mergeProductMetadata(
  metadata: ProductMetadataValue,
  nextValues: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(metadata && typeof metadata === "object" ? metadata : {}),
    ...nextValues,
  };
}
