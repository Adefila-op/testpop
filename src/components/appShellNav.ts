import {
  Home,
  User,
  Sparkles,
  ShoppingBag,
  Gavel,
  Gift,
  TrendingUp,
  Settings,
  BarChart3,
  History,
} from "lucide-react";

export const appShellNavItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Sparkles, label: "Discover", path: "/discover" },
  { icon: User, label: "Profile", path: "/profile" },
] as const;

// Secondary navigation items for marketplace/creator/collection sections
export const secondaryNavItems = [
  {
    section: "Marketplace",
    items: [
      { icon: ShoppingBag, label: "Browse", path: "/marketplace/browse" },
      { icon: Gavel, label: "Auctions", path: "/marketplace/auctions" },
      { icon: Gift, label: "Gifts", path: "/marketplace/gifts" },
    ],
  },
  {
    section: "Collection",
    items: [
      { icon: ShoppingBag, label: "My NFTs", path: "/collection/nfts" },
      { icon: History, label: "Purchases", path: "/collection/purchases" },
    ],
  },
  {
    section: "Creator",
    items: [
      { icon: TrendingUp, label: "Earnings", path: "/creator/earnings" },
      { icon: Gavel, label: "Royalties", path: "/creator/royalties" },
      { icon: History, label: "Payouts", path: "/creator/payout-history" },
      { icon: User, label: "Collaborators", path: "/creator/collaborators" },
      { icon: Settings, label: "Payout Settings", path: "/creator/payout-settings" },
    ],
  },
  {
    section: "Admin",
    items: [
      { icon: BarChart3, label: "Dashboard", path: "/admin/dashboard" },
    ],
  },
] as const;

export function isAppShellNavActive(itemPath: string, pathname: string) {
  return (
    pathname === itemPath ||
    (itemPath === "/discover" && (pathname === "/discover" || pathname.startsWith("/discover/"))) ||
    (itemPath === "/profile" &&
      (pathname.startsWith("/profile") ||
        pathname.startsWith("/wallet") ||
        pathname.startsWith("/orders") ||
        pathname.startsWith("/collection") ||
        pathname.startsWith("/poaps") ||
        pathname.startsWith("/subscriptions") ||
        pathname.startsWith("/checkout") ||
        pathname.startsWith("/gift") ||
        pathname.startsWith("/products") ||
        pathname.startsWith("/studio") ||
        pathname.startsWith("/creator")))
  );
}
