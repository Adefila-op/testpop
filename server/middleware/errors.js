/**
 * Error Handling Middleware
 * Location: server/middleware/errors.js
 * 
 * Wraps async route handlers with automatic error catching
 */

export const errorHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error("❌ Error:", {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Contract/blockchain errors
    if (error.code === "INSUFFICIENT_FUNDS") {
      return res.status(402).json({
        error: "Insufficient balance",
        code: "INSUFFICIENT_FUNDS",
      });
    }

    if (error.code === "REVERTED") {
      const reason = error.reason || "Transaction reverted";
      return res.status(400).json({
        error: reason,
        code: "TRANSACTION_REVERTED",
      });
    }

    if (error.code === "NONCE_EXPIRED") {
      return res.status(400).json({
        error: "Transaction nonce expired, please retry",
        code: "NONCE_EXPIRED",
      });
    }

    if (error.code === "CALL_EXCEPTION") {
      return res.status(400).json({
        error: "Contract call failed - check parameters",
        code: "CALL_EXCEPTION",
      });
    }

    // Network errors
    if (error.code === "NETWORK_ERROR" || error.code === "ENOTFOUND") {
      return res.status(503).json({
        error: "Network error - unable to process transaction",
        code: "NETWORK_ERROR",
      });
    }

    // Validation errors (from Zod)
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        issues: error.errors,
      });
    }

    // Timeout errors
    if (error.code === "ETIMEDOUT" || error.timeout) {
      return res.status(504).json({
        error: "Request timeout - transaction may still be processing",
        code: "TIMEOUT",
      });
    }

    // Database errors
    if (error.code === "42P01") {
      return res.status(500).json({
        error: "Database error - table not found",
        code: "DB_TABLE_NOT_FOUND",
      });
    }

    if (error.message?.includes("duplicate key")) {
      return res.status(409).json({
        error: "Duplicate entry",
        code: "DUPLICATE_ENTRY",
      });
    }

    // Authorization errors
    if (error.status === 401 || error.code === "UNAUTHORIZED") {
      return res.status(401).json({
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    if (error.status === 403 || error.code === "FORBIDDEN") {
      return res.status(403).json({
        error: "Forbidden",
        code: "FORBIDDEN",
      });
    }

    // Default error
    return res.status(error.status || 500).json({
      error: error.message || "Internal server error",
      code: error.code || "INTERNAL_ERROR",
    });
  });
};

/**
 * Authentication middleware
 */
export const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: "Authentication required",
      code: "NOT_AUTHENTICATED",
    });
  }
  next();
};

/**
 * Rate limiting middleware
 */
import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: "Too many login attempts",
  skipSuccessfulRequests: true,
});

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "warn" : "info";
    console.log(
      `[${level.toUpperCase()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

/**
 * CORS configuration
 */
export const corsConfig = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
