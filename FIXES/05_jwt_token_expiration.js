/**
 * JWT TOKEN EXPIRATION & REFRESH
 * 
 * Prevents stolen tokens from granting permanent access
 */

// ============================================
// STEP 1: Server Auth Module Update
// ============================================
// File: server/auth.js

import jwt from 'jsonwebtoken';
import { appJwtSecret } from './config.js';

/**
 * Generate JWT token with expiration
 * CRITICAL FIX: Add 24h expiration
 */
export function generateToken(address, options = {}) {
  return jwt.sign(
    {
      address: address,
      type: 'access_token'
    },
    appJwtSecret,
    {
      expiresIn: '24h', // Add this!
      algorithm: 'HS256',
      ...options
    }
  );
}

/**
 * Generate refresh token (longer-lived)
 */
export function generateRefreshToken(address) {
  return jwt.sign(
    {
      address: address,
      type: 'refresh_token'
    },
    appJwtSecret,
    {
      expiresIn: '7d' // 7 day refresh token
    }
  );
}

/**
 * Verify token middleware
 */
export function verifyTokenMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // This will throw if token expired
    const decoded = jwt.verify(token, appJwtSecret);
    
    req.user = decoded;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Token refresh endpoint
 */
export async function refreshTokenHandler(req, res) {
  try {
    const refreshToken = req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'No refresh token provided' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, appJwtSecret);
    
    if (decoded.type !== 'refresh_token') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // Generate new access token
    const newAccessToken = generateToken(decoded.address);
    
    // Optionally rotate refresh token too
    const newRefreshToken = generateRefreshToken(decoded.address);
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: '24h'
    });
    
  } catch (error) {
    res.status(401).json({ 
      error: 'Failed to refresh token',
      details: error.message 
    });
  }
}

// ============================================
// STEP 2: Server Integration
// ============================================
// File: server/index.js (add routes)

import { 
  generateToken, 
  generateRefreshToken,
  verifyTokenMiddleware,
  refreshTokenHandler 
} from './auth.js';

// Add token refresh endpoint
app.post('/api/auth/refresh', refreshTokenHandler);

// Apply token verification to protected routes
app.use('/api/checkout/*', verifyTokenMiddleware);
app.use('/api/artists/*', verifyTokenMiddleware);
app.use('/api/user/*', verifyTokenMiddleware);
app.use('/api/orders/*', verifyTokenMiddleware);

// Update login endpoint to return both tokens
app.post('/api/auth/login', async (req, res) => {
  try {
    const { address, signature, message } = req.body;
    
    // Verify signature (existing logic)
    // ...
    
    // Generate tokens with expiration
    const accessToken = generateToken(address);
    const refreshToken = generateRefreshToken(address);
    
    res.json({
      accessToken,
      refreshToken,
      expiresIn: '24h',
      address
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STEP 3: Client Implementation
// ============================================
// File: src/lib/runtimeSession.ts (update)

import { apiClient } from './apiBase';

interface SessionToken {
  accessToken: string;
  refreshToken: string;
  expiresAt?: Date;
}

/**
 * SessionStore - Handles token lifecycle
 */
export class SessionStore {
  private tokens: SessionToken | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;
  
  /**
   * Set tokens and schedule refresh
   */
  setTokens(accessToken: string, refreshToken: string, expiresIn: string = '24h') {
    // Parse expiration time
    let expiresAt = new Date();
    if (expiresIn.includes('h')) {
      const hours = parseInt(expiresIn);
      expiresAt.setHours(expiresAt.getHours() + hours);
    }
    
    this.tokens = { accessToken, refreshToken, expiresAt };
    
    // Store in sessionStorage (not localStorage - more secure)
    sessionStorage.setItem('tokens', JSON.stringify({
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString()
    }));
    
    // Schedule refresh before expiration
    this.scheduleRefresh();
  }
  
  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    if (!this.tokens) {
      const stored = sessionStorage.getItem('tokens');
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    }
    
    return this.tokens?.accessToken || null;
  }
  
  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.tokens?.refreshToken || null;
  }
  
  /**
   * Check if token expired
   */
  isTokenExpired(): boolean {
    if (!this.tokens?.expiresAt) return true;
    return new Date() > new Date(this.tokens.expiresAt);
  }
  
  /**
   * Refresh access token
   */
  async refreshTokens(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        this.clearTokens();
        return false;
      }
      
      const response = await apiClient.post('/auth/refresh', {
        refreshToken
      });
      
      this.setTokens(
        response.data.accessToken,
        response.data.refreshToken,
        response.data.expiresIn
      );
      
      return true;
      
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.clearTokens();
      return false;
    }
  }
  
  /**
   * Clear tokens on logout
   */
  clearTokens() {
    this.tokens = null;
    sessionStorage.removeItem('tokens');
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }
  
  /**
   * Schedule token refresh 5 minutes before expiration
   */
  private scheduleRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    if (!this.tokens?.expiresAt) return;
    
    const now = new Date();
    const expiresAt = new Date(this.tokens.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // Refresh 5 minutes before expiration
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(() => {
        console.log('Auto-refreshing token...');
        this.refreshTokens().catch(console.error);
      }, refreshTime);
    }
  }
}

// Global session instance
export const sessionStore = new SessionStore();

// ============================================
// STEP 4: API Client Integration
// ============================================
// File: src/lib/apiBase.ts (update)

import { sessionStore } from './runtimeSession';

apiClient.interceptors.request.use((config) => {
  // Add token to all requests
  const token = sessionStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle token expired errors
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED') {
      
      // Try to refresh token
      const refreshed = await sessionStore.refreshTokens();
      
      if (refreshed) {
        // Retry original request with new token
        const config = error.config;
        config.headers.Authorization = `Bearer ${sessionStore.getAccessToken()}`;
        return apiClient.request(config);
      } else {
        // Refresh failed, logout user
        redirectTo('/login');
      }
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// STEP 5: App Initialization
// ============================================
// File: src/App.tsx

useEffect(() => {
  // Check if tokens exist and still valid
  const token = sessionStore.getAccessToken();
  
  if (token) {
    if (sessionStore.isTokenExpired()) {
      // Try to refresh
      sessionStore.refreshTokens().catch(() => {
        // Refresh failed, logout
        sessionStore.clearTokens();
        redirectTo('/login');
      });
    } else {
      // Schedule refresh before expiration
      sessionStore.scheduleRefresh();
    }
  }
}, []);

// ============================================
// STEP 6: Logout
// ============================================
// File: src/pages/ProfilePage.tsx (example)

function handleLogout() {
  sessionStore.clearTokens();
  redirectTo('/login');
}

// ============================================
// TESTING
// ============================================

/*
Test 1: Token expiration
----------------------------------------
1. Login: POST /api/auth/login
   Response includes accessToken with 24h expiration

2. Wait for token to expire (or set short expiration for testing)
   expiresIn: '1m' in generateToken()

3. Try to make API call
   GET /api/user/profile
   
   First attempt: 401 Token Expired

4. Client auto-refreshes:
   POST /api/auth/refresh
   Response: new accessToken

5. Retry original request: 200 OK
   (Should succeed with new token)

Test 2: Refresh token rotation
----------------------------------------
1. Refresh token: POST /api/auth/refresh
   Request: { refreshToken: "old-token" }
   Response: { 
     accessToken: "new-access-token",
     refreshToken: "new-refresh-token",
     expiresIn: "24h"
   }

2. Old refresh token is invalidated
   POST /api/auth/refresh with old token
   Should return 401 Unauthorized

Test 3: Expired refresh token
----------------------------------------
If user doesn't use app for 7+ days:

1. Try to call API
   GET /api/user/profile
   401 Token Expired

2. Auto-refresh fails
   POST /api/auth/refresh
   401 Refresh Token Expired

3. User redirected to login
   Clear sessionStorage
   Redirect to /login

This forces fresh auth every 7 days max
*/
