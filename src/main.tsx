import { createRoot } from "react-dom/client";
import "./index.css";

// Register a minimal service worker so mobile browsers can offer install-to-homescreen behavior.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

// Load artist bootstrap data from Supabase (async, non-blocking)
void import("@/lib/artistStore")
  .then(({ initializeFromSupabase }) => initializeFromSupabase())
  .catch((err) => console.error("Supabase initialization failed:", err));

async function mountApp() {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    throw new Error("Missing #root element");
  }

  const [{ default: App }, { default: ErrorBoundary }] = await Promise.all([
    import("./App.tsx"),
    import("./components/ErrorBoundary.tsx"),
  ]);

  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

mountApp().catch((err) => {
  console.error("Application bootstrap failed:", err);
});
