/**
 * IDEMPOTENCY KEYS - Implementation Guide
 * 
 * Prevents duplicate orders when requests are retried
 * Each request has a unique idempotency key
 * If same key sent twice, returns cached response
 */

// ============================================
// STEP 1: Database Migration
// ============================================
// File: supabase/migrations/20260405_add_idempotency_keys.sql

// Add idempotency key tracking table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  user_address TEXT,
  response_data JSONB,
  status_code INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_idempotency_key ON idempotency_keys(idempotency_key, user_address);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- Clean up expired keys automatically (optional, manual cleanup also works)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

// ============================================
// STEP 2: Server Middleware
// ============================================
// File: server/middleware/idempotency.js

import { createClient } from '@supabase/supabase-js';

/**
 * Idempotency middleware
 * Must be applied BEFORE route handlers
 */
export function idempotencyMiddleware(supabaseAdmin) {
  return async (req, res, next) => {
    // Only apply to POST/PATCH/DELETE/PUT
    if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
      return next();
    }
    
    const idempotencyKey = req.headers['x-idempotency-key'];
    
    if (!idempotencyKey) {
      // Idempotency key recommended for safety
      console.warn(`No idempotency key for ${req.method} ${req.path}`);
      return next();
    }
    
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid idempotency key format' 
      });
    }
    
    try {
      // Check if this idempotency key was already processed
      const { data: existing } = await supabaseAdmin
        .from('idempotency_keys')
        .select('response_data, status_code')
        .eq('idempotency_key', idempotencyKey)
        .eq('user_address', req.user?.address || 'anonymous')
        .single();
      
      if (existing) {
        // Return cached response
        console.log(`Returning cached response for idempotency key: ${idempotencyKey}`);
        return res.status(existing.status_code).json(existing.response_data);
      }
      
      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        // Save successful response
        if (res.statusCode === 200 || res.statusCode === 201) {
          supabaseAdmin
            .from('idempotency_keys')
            .insert({
              idempotency_key: idempotencyKey,
              request_method: req.method,
              request_path: req.path,
              user_address: req.user?.address || 'anonymous',
              response_data: data,
              status_code: res.statusCode
            })
            .catch(err => console.error('Failed to cache response:', err));
        }
        
        return originalJson(data);
      };
      
      next();
      
    } catch (error) {
      console.error('Idempotency middleware error:', error);
      // Continue anyway - don't block requests on idempotency failure
      next();
    }
  };
}

// ============================================
// STEP 3: Server Integration
// ============================================
// File: server/index.js (add to middleware setup)

import { idempotencyMiddleware } from './middleware/idempotency.js';

// Add AFTER CSRF middleware, BEFORE routes
app.use(idempotencyMiddleware(supabaseAdmin));

// ============================================
// STEP 4: Client Implementation
// ============================================
// File: src/lib/apiBase.ts (add function)

import { v4 as uuidv4 } from 'uuid';

/**
 * Create order with idempotency key
 * Safe to retry without duplicating orders
 */
export async function createOrderIdempotent(orderData) {
  const idempotencyKey = uuidv4();
  
  try {
    const response = await apiClient.post('/checkout/order', orderData, {
      headers: {
        'X-Idempotency-Key': idempotencyKey
      }
    });
    
    return response.data;
    
  } catch (error) {
    // If network error, user can retry with same key
    // Server will detect duplicate and return same response
    throw error;
  }
}

// ============================================
// STEP 5: Component Usage
// ============================================
// File: src/pages/CheckoutPage.tsx (example)

import { createOrderIdempotent } from '@/lib/apiBase';

export function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // No try-catch needed for duplicate protection
      // Can safely retry on network error
      const order = await createOrderIdempotent({
        dropId: drop.id,
        quantity: cartItem.quantity,
        priceEth: drop.price_eth
      });
      
      // Navigate to payment
      navigateTo(`/payment/${order.orderId}`);
      
    } catch (err) {
      setError(err.message);
      // User can retry safely - same key will return cached response
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div>
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button onClick={handleCheckout} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Complete Purchase'}
      </Button>
    </div>
  );
}

// ============================================
// STEP 6: Testing
// ============================================

/*
Test 1: Verify duplicate detection
----------------------------------------
1. Make this request:

POST /api/checkout/order HTTP/1.1
X-Idempotency-Key: abc-123-def
X-CSRF-Token: valid-token
Content-Type: application/json

{
  "dropId": "123",
  "quantity": 1,
  "priceEth": "0.5"
}

Response: 201 Created
{
  "orderId": "order-1",
  "status": "pending_payment"
}

2. Immediately retry with same key:

POST /api/checkout/order HTTP/1.1
X-Idempotency-Key: abc-123-def
X-CSRF-Token: valid-token
Content-Type: application/json

{
  "dropId": "123",
  "quantity": 1,
  "priceEth": "0.5"
}

Response: 201 Created  (or 200, depending on implementation)
{
  "orderId": "order-1",  // SAME ORDER ID!
  "status": "pending_payment"
}

3. Verify only one order created in database
SELECT count(*) FROM orders WHERE id = 'order-1';
-- Should return 1, not 2

Test 2: Verify different keys create different orders
----------------------------------------
First request: X-Idempotency-Key: key-1
Second request: X-Idempotency-Key: key-2

Each should create separate orders
*/
