/**
 * Admin wallet allowlist for accessing /admin.
 * Supports either a single VITE_ADMIN_WALLET value or a comma-separated list.
 * VITE_FOUNDER_WALLET is also accepted as a fallback alias.
 */
const adminWalletCandidates = [
  import.meta.env.VITE_ADMIN_WALLET || "",
  import.meta.env.VITE_ADMIN_WALLETS || "",
  import.meta.env.VITE_FOUNDER_WALLET || "",
];

export const ADMIN_WALLETS = Array.from(
  new Set(
    adminWalletCandidates
      .flatMap((value) => value.split(","))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
);

export const ADMIN_WALLET = ADMIN_WALLETS[0] || "";

export function isAdminWallet(address: string | undefined): boolean {
  if (!address || ADMIN_WALLETS.length === 0) {
    return false;
  }

  return ADMIN_WALLETS.includes(address.toLowerCase());
}
