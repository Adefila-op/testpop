import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import AppLayout from "./components/AppLayout";
import MobileWebAppGate from "./components/MobileWebAppGate";
import WalletRuntimeProvider from "./components/wallet/WalletRuntimeProvider";
import { ThemeProvider } from "./components/theme-provider";
import NotFound from "./pages/NotFound";
import { initializePushNotifications } from "@/lib/webPush";

const RebootHomePage = lazy(() => import("./pages/RebootHomePage"));
const RebootDiscoverFeedPage = lazy(() => import("./pages/RebootDiscoverFeedPage"));
const RebootProfileDashboardPage = lazy(() => import("./pages/RebootProfileDashboardPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then((module) => ({ default: module.CheckoutPage })));
const GiftClaimPage = lazy(() => import("./pages/GiftClaimPage"));
const FreshProductDetailPage = lazy(() => import("./pages/FreshProductDetailPage"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard").then((module) => ({ default: module.CreatorDashboard })));
const ArtistsPage = lazy(() => import("./pages/ArtistsPage"));
const ArtistProfilePage = lazy(() => import("./pages/ArtistProfilePage"));
const ArtistStudioPage = lazy(() => import("./pages/ArtistStudioPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const App = () => {
  useEffect(() => {
    initializePushNotifications().catch((err) => {
      console.warn("Failed to initialize push notifications:", err);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WalletRuntimeProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <MobileWebAppGate>
              <BrowserRouter>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<RebootHomePage />} />
                      <Route path="/discover" element={<RebootDiscoverFeedPage />} />
                      <Route path="/profile" element={<RebootProfileDashboardPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/gift/:token" element={<GiftClaimPage />} />
                      <Route path="/products/:id" element={<FreshProductDetailPage />} />
                      <Route path="/artists" element={<ArtistsPage />} />
                      <Route path="/artists/:id" element={<ArtistProfilePage />} />
                      <Route path="/studio" element={<ArtistStudioPage />} />
                      <Route path="/creator/analytics" element={<CreatorDashboard />} />
                      <Route path="/cart" element={<Navigate to="/profile" replace />} />
                      <Route path="/orders" element={<Navigate to="/profile" replace />} />
                      <Route path="/collection" element={<Navigate to="/profile" replace />} />
                      <Route path="/poaps" element={<Navigate to="/profile" replace />} />
                      <Route path="/subscriptions" element={<Navigate to="/profile" replace />} />
                      <Route path="/feed" element={<Navigate to="/discover" replace />} />
                      <Route path="/catalog" element={<Navigate to="/discover" replace />} />
                      <Route path="/share/:postId" element={<Navigate to="/discover" replace />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </MobileWebAppGate>
          </TooltipProvider>
        </ThemeProvider>
      </WalletRuntimeProvider>
    </QueryClientProvider>
  );
};

export default App;
