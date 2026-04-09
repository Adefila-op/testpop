import { Flame, Home, Inbox, ShoppingBag, User, Sparkles, BarChart3 } from "lucide-react";

export const appShellNavItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Sparkles, label: "Discover", path: "/catalog" },
  { icon: Flame, label: "Drops", path: "/drops" },
  { icon: Inbox, label: "Inbox", path: "/inbox" },
  { icon: ShoppingBag, label: "Releases", path: "/products" },
  { icon: BarChart3, label: "Analytics", path: "/creator/analytics" },
  { icon: User, label: "Profile", path: "/profile" },
] as const;

export function isAppShellNavActive(itemPath: string, pathname: string) {
  return (
    pathname === itemPath ||
    (itemPath === "/catalog" && (pathname === "/catalog" || pathname.startsWith("/catalog/"))) ||
    (itemPath === "/drops" && pathname.startsWith("/drops/")) ||
    (itemPath === "/inbox" && pathname.startsWith("/inbox")) ||
    (itemPath === "/creator/analytics" && pathname.startsWith("/creator/analytics")) ||
    (itemPath === "/profile" &&
      (pathname.startsWith("/profile") ||
        pathname.startsWith("/wallet") ||
        pathname.startsWith("/cart") ||
        pathname.startsWith("/checkout") ||
        pathname.startsWith("/orders") ||
        pathname.startsWith("/collection") ||
        pathname.startsWith("/poaps") ||
        pathname.startsWith("/subscriptions") ||
        pathname.startsWith("/studio"))) ||
    (itemPath === "/products" && pathname.startsWith("/products"))
  );
}
