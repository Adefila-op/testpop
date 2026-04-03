import { resolveMediaUrl } from "@/lib/pinata";

type PortfolioImageLike = {
  image?: string | null;
  imageUrl?: string | null;
  image_uri?: string | null;
  imageUri?: string | null;
  preview_uri?: string | null;
  previewUri?: string | null;
};

export function resolvePortfolioImage(piece?: PortfolioImageLike | string | null): string {
  if (!piece) {
    return "";
  }

  if (typeof piece === "string") {
    return resolveMediaUrl(piece);
  }

  return resolveMediaUrl(
    piece.image,
    piece.imageUrl,
    piece.imageUri,
    piece.image_uri,
    piece.previewUri,
    piece.preview_uri
  );
}
