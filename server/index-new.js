import path from "path";
import { fileURLToPath } from "url";
import { app, DROP_MAINTENANCE_INTERVAL_MS } from "./config.js";
import { authRoutes, authRequired, authOptional } from "./auth.js";
import { campaignRoutes } from "./campaigns.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDistCandidates = [
  path.resolve(__dirname, "dist"),
  path.resolve(__dirname, "../dist"),
  path.resolve(process.cwd(), "server", "dist"),
  path.resolve(process.cwd(), "dist"),
];
const frontendDistPath =
  frontendDistCandidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "index.html"))
  ) ||
  frontendDistCandidates.find((candidate) => fs.existsSync(candidate)) ||
  frontendDistCandidates[0];
const frontendIndexPath = path.join(frontendDistPath, "index.html");

// Import fs here since it's used for frontend serving
import fs from "fs";

// Initialize routes
authRoutes(app);
campaignRoutes(app, authRequired);

// Static file serving
app.use(express.static(frontendDistPath));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(frontendIndexPath);
});

// Import express for static serving
import express from "express";

// Start server
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Frontend served from: ${frontendDistPath}`);
});

// Maintenance tasks
let lastExpiredDropMaintenanceAt = 0;
let expiredDropMaintenancePromise = null;

async function cleanupExpiredDropsAndCampaigns() {
  // Implementation moved to maintenance.js if needed
  return { ended: 0, removed: 0 };
}

async function runExpiredDropMaintenanceIfDue(force = false) {
  const now = Date.now();
  if (!force && now - lastExpiredDropMaintenanceAt < DROP_MAINTENANCE_INTERVAL_MS) {
    return null;
  }

  if (expiredDropMaintenancePromise) {
    return expiredDropMaintenancePromise;
  }

  lastExpiredDropMaintenanceAt = now;
  expiredDropMaintenancePromise = cleanupExpiredDropsAndCampaigns()
    .catch((error) => {
      console.error("Expired drop maintenance failed:", error);
    })
    .finally(() => {
      expiredDropMaintenancePromise = null;
    });

  return expiredDropMaintenancePromise;
}

// Run maintenance on startup
runExpiredDropMaintenanceIfDue(true);