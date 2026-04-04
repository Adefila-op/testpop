import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import { supabase, appJwtSecret, normalizeWallet, authLimiter } from "./config.js";

// Authentication utilities
function sameWalletOrAdmin(wallet1, auth) {
  if (!wallet1 || !auth?.wallet) return false;
  return normalizeWallet(wallet1) === normalizeWallet(auth.wallet) || isAdmin(auth.wallet);
}

function isAdmin(wallet) {
  if (!wallet) return false;
  const adminWallets = (process.env.ADMIN_WALLETS || "").split(",").map(w => normalizeWallet(w.trim())).filter(Boolean);
  return adminWallets.includes(normalizeWallet(wallet));
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, appJwtSecret);
    req.auth = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function authOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.auth = null;
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, appJwtSecret);
    req.auth = decoded;
  } catch {
    req.auth = null;
  }
  next();
}

// Challenge/verify endpoints
const authRoutes = (app) => {
  app.post("/auth/challenge", authLimiter, async (req, res) => {
    try {
      const { wallet } = req.body;
      if (!wallet) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const normalizedWallet = normalizeWallet(wallet);
      if (!ethers.isAddress(normalizedWallet)) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      const challenge = `Sign this message to authenticate with PopUp: ${Date.now()}`;
      const challengeHash = ethers.hashMessage(challenge);

      return res.json({
        challenge,
        challengeHash,
        wallet: normalizedWallet,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to generate challenge" });
    }
  });

  app.post("/auth/verify", authLimiter, async (req, res) => {
    try {
      const { wallet, signature, challenge } = req.body;
      if (!wallet || !signature || !challenge) {
        return res.status(400).json({ error: "Wallet, signature, and challenge are required" });
      }

      const normalizedWallet = normalizeWallet(wallet);
      if (!ethers.isAddress(normalizedWallet)) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      const recoveredAddress = ethers.verifyMessage(challenge, signature);
      if (normalizeWallet(recoveredAddress) !== normalizedWallet) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Check if artist exists
      const { data: artist } = await supabase
        .from("artists")
        .select("id, wallet, approval_status")
        .eq("wallet", normalizedWallet)
        .single();

      const token = jwt.sign(
        {
          wallet: normalizedWallet,
          artistId: artist?.id || null,
          isApproved: artist?.approval_status === "approved",
          iat: Math.floor(Date.now() / 1000),
        },
        appJwtSecret,
        { expiresIn: "5m" }
      );

      return res.json({
        token,
        artist: artist ? {
          id: artist.id,
          approval_status: artist.approval_status,
        } : null,
      });
    } catch (error) {
      return res.status(500).json({ error: "Authentication failed" });
    }
  });
};

export {
  sameWalletOrAdmin,
  isAdmin,
  authRequired,
  authOptional,
  authRoutes,
};