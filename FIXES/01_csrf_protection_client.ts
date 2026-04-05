/**
 * CSRF PROTECTION - Client Implementation
 * File: src/lib/apiBase.ts (updated)
 * 
 * This modifies the API client to fetch and include CSRF tokens
 */

import axios, { AxiosError, AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_SECURE_API_BASE_URL || '/api';

let csrfToken: string | null = null;

/**
 * Fetch CSRF token from server
 * Call this once on app startup
 */
export async function initializeCsrfToken(): Promise<void> {
  try {
    const response = await axios.get(`${API_BASE_URL}/csrf-token`);
    csrfToken = response.data.csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    // Don't fail startup, but subsequent POST requests will fail
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: send cookies
});

/**
 * Request interceptor to add CSRF token to all state-changing requests
 */
apiClient.interceptors.request.use((config) => {
  // Add CSRF token to POST, PATCH, DELETE, PUT requests
  if (['post', 'patch', 'delete', 'put'].includes(config.method?.toLowerCase() || '')) {
    if (!csrfToken) {
      console.warn('CSRF token not initialized');
    }
    config.headers['X-CSRF-Token'] = csrfToken || '';
  }
  
  return config;
});

/**
 * Response interceptor to handle CSRF errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 403) {
      const data = error.response?.data as any;
      if (data?.code === 'CSRF_VALIDATION_FAILED') {
        // Token expired, try to refresh
        console.error('CSRF token invalid, refreshing...');
        // Optionally refresh token and retry
        initializeCsrfToken().catch(console.error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * HOW TO USE:
 * 
 * 1. In src/main.tsx or App.tsx, call on startup:
 *    import { initializeCsrfToken } from '@/lib/apiBase';
 *    
 *    useEffect(() => {
 *      initializeCsrfToken();
 *    }, []);
 *
 * 2. Use apiClient as normal:
 *    const response = await apiClient.post('/checkout/order', {...});
 *    // CSRF token is automatically added!
 * 
 * 3. Verify server returns 403 if token missing:
 *    // Should work: has valid token
 *    // Should fail: invalid/missing token
 */
