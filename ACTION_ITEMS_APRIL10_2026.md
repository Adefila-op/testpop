# 🚀 POPUP Platform: ACTIONABLE FIXES (April 10, 2026)

**Status:** 65% complete. Ready for UAT once critical fixes are applied.

---

## ⚡ TOP 5 BLOCKERS (Do First - High Impact)

### 1. CSRF PROTECTION - NOT ACTIVE ❌ (P1 BLOCKER)
**Time to fix:** 2-4 hours  
**Steps:**
```bash
# 1. Import middleware in server/index.js (line 30)
import { validateCSRF, generateCSRFToken } from "./middleware/csrf.js";

# 2. Add CSRF token endpoint in server/index.js (line ~1700)
app.get("/api/csrf-token", (req, res) => {
  const token = generateCSRFToken();
  res.json({ token });
});

# 3. Find all POST/PUT/DELETE endpoints in server/index.js and add validateCSRF
# Example: 
#   BEFORE: app.post("/api/orders", orderHandler);
#   AFTER:  app.post("/api/orders", validateCSRF, orderHandler);

# 4. Update src/lib/api.ts or fetch wrapper to include token
# Add this to your fetch function:
#   const token = await fetch('/api/csrf-token').then(r => r.json()).then(d => d.token);
#   headers['X-CSRF-Token'] = token;
```
**Files to change:**
- `server/index.js` (add import + endpoint + middleware)
- `src/lib/api.ts` or wherever you make API calls (add token to headers)
**Verify:** Try to make a POST request WITHOUT token header → should get 403 error

---

### 2. RLS POLICIES - UNVERIFIED IN PRODUCTION ❌ (P1 BLOCKER)
**Time to fix:** 1-2 hours  
**Steps:**
```bash
# 1. Check if migration is applied in prod
supabase migration list --project-ref YOUR_SUPABASE_PROJECT_ID

# 2. If NOT applied, apply it:
# Option A: Via Supabase CLI
supabase db push

# Option B: Via Supabase Dashboard > SQL Editor
# Copy & paste: supabase/migrations/20260405_rls_policies_production.sql

# 3. TEST - Create test script test-rls.mjs:
```
**Test Script (`server/test-rls.mjs`):**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testRLS() {
  console.log('Testing RLS policies...');
  
  // Test 1: Non-admin cannot read all orders
  const { data: orders, error: e1 } = await supabase
    .from('orders')
    .select('*');
  
  console.log('✓ Query executed');
  console.log(`  Returned ${orders?.length || 0} rows`);
  
  if (orders?.length > 5) {
    console.error('❌ FAIL: User can read all orders (RLS BROKEN)');
    process.exit(1);
  }
  
  console.log('✅ PASS: RLS working correctly');
}

testRLS().catch(console.error);
```
**Run test:**
```bash
node server/test-rls.mjs
```
**Expected output:** "✅ PASS: RLS working correctly"

---

### 3. INPUT VALIDATION - NOT APPLIED ❌ (P1 BLOCKER)
**Time to fix:** 2-3 days  
**What's done:** Schemas exist in `server/validation.js`  
**What's not done:** Not used in endpoints  
**Steps:**
```bash
# 1. Create validation middleware in server/index.js (line ~200)
function requireValidation(schema) {
  return (req, res, next) => {
    try {
      req.validated = schema.parse(req.body);
      next();
    } catch (e) {
      console.error('Validation error:', e.flatten());
      res.status(400).json({ 
        error: 'Invalid input',
        details: e.flatten().fieldErrors
      });
    }
  };
}

# 2. Find all POST/PUT endpoints and add validation
# Example:
#   BEFORE: app.post("/api/drops", async (req, res) => { ... })
#   AFTER:  app.post("/api/drops", validateCSRF, requireValidation(dropCreateSchema), async (req, res) => { ... })
#   Then use: const { title, description } = req.validated;

# 3. For endpoints WITHOUT schemas, create them in server/validation.js
# Example missing schemas to add:
#   - subscriptionCreateSchema
#   - orderCreateSchema  
#   - ipCampaignSchema
```
**Files to update:**
- `server/index.js` (add middleware, apply to endpoints)
- `server/validation.js` (add missing schemas)

**Test:**
```bash
# Try to create drop with invalid data - should fail
curl -X POST http://localhost:3000/api/drops \
  -H "Content-Type: application/json" \
  -d '{"title": "", "description": "test"}'  # Empty title should fail
```

---

### 4. JWT TOKEN EXPIRATION - NOT IMPLEMENTED ❌ (P2)
**Time to fix:** 1 day  
**Steps:**
```bash
# Find auth verification endpoint in server/index.js (~line 2000)
# 
# BEFORE:
#   const token = jwt.sign(
#     { user_id: artist.id, wallet: artist.wallet, role: 'user' },
#     appJwtSecret
#   );
#
# AFTER:
#   const token = jwt.sign(
#     { user_id: artist.id, wallet: artist.wallet, role: 'user' },
#     appJwtSecret,
#     { expiresIn: '24h' }  // Add this line
#   );

# 2. Add refresh token endpoint (line ~2050)
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  
  // Verify refresh token
  try {
    const decoded = jwt.verify(refreshToken, appJwtSecret);
    const newToken = jwt.sign(
      { user_id: decoded.user_id, wallet: decoded.wallet, role: decoded.role },
      appJwtSecret,
      { expiresIn: '24h' }
    );
    res.json({ token: newToken });
  } catch (e) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

# 3. On client side (src/lib/api.ts), check token expiration before API calls
# If expires in < 5 min, call refresh endpoint first
```

---

### 5. IDEMPOTENCY KEYS - NOT IMPLEMENTED ❌ (P2)
**Time to fix:** 1 day  
**Why it matters:** Prevents duplicate orders if user clicks "buy" twice  
**Steps:**
```bash
# 1. Add column to orders table (supabase/migrations/001_add_idempotency.sql)
ALTER TABLE orders ADD COLUMN idempotency_key UUID UNIQUE;
CREATE INDEX idx_orders_idempotency ON orders(idempotency_key);

# 2. In order creation endpoint in server/index.js:
app.post("/api/orders", requireValidation(orderSchema), async (req, res) => {
  const { idempotency_key, item_id, quantity } = req.validated;
  
  // Check if this order already exists
  const existing = await supabase
    .from('orders')
    .select('*')
    .eq('idempotency_key', idempotency_key)
    .maybeSingle();
  
  if (existing.data) {
    // Order already exists, return cached result
    return res.json({ order: existing.data, cached: true });
  }
  
  // Create new order
  const newOrder = await createOrderLogic(...);
  res.json({ order: newOrder, cached: false });
});

# 3. On client side: generate UUID before submitting order
# const idempotencyKey = crypto.randomUUID();
# const response = await fetch('/api/orders', {
#   method: 'POST',
#   body: JSON.stringify({ idempotency_key: idempotencyKey, ... })
# });
```

---

## 📊 PRIORITY MATRIX

| Item | Impact | Effort | Priority | Timeline |
|------|--------|--------|----------|----------|
| CSRF | 🔴 CRITICAL | 4 hrs | P1 | TODAY |
| RLS Verify | 🔴 CRITICAL | 2 hrs | P1 | TODAY |
| Input Validation | 🔴 CRITICAL | 2 days | P1 | THIS WEEK |
| JWT Expiration | 🟠 HIGH | 1 day | P2 | THIS WEEK |
| Idempotency Keys | 🟠 HIGH | 1 day | P2 | THIS WEEK |
| N+1 Queries | 🟠 HIGH | 2 days | P2 | NEXT WEEK |
| Rate Limiting | 🟡 MEDIUM | 1 day | P2 | NEXT WEEK |
| Server Refactoring | 🟡 MEDIUM | 2 weeks | P3 | LATER |

---

## ✅ QUICK AUDIT CHECKLIST (Print This)

Before going to staging:
- [ ] CSRF middleware imported in server/index.js
- [ ] CSRF middleware applied to 50+ POST/PUT/DELETE endpoints
- [ ] `/api/csrf-token` endpoint works
- [ ] Client sends X-CSRF-Token header on all mutations
- [ ] RLS migration verified in production Supabase
- [ ] Test RLS: non-admin user can only read own orders
- [ ] Input validation schemas created for all POST/PUT endpoints
- [ ] Validation middleware applied to all endpoints
- [ ] JWT tokens expire after 24h
- [ ] Refresh token endpoint works
- [ ] Idempotency keys prevent duplicate orders
- [ ] Error boundaries prevent white screen crashes
- [ ] No 🔴 CRITICAL items unchecked

---

## 📁 FILES YOU'LL MODIFY

1. **server/index.js** (core file - biggest changes)
   - Import CSRF middleware
   - Add CSRF token endpoint
   - Add validation middleware
   - Apply to all POST/PUT/DELETE routes
   - Update JWT generation

2. **server/validation.js** (add missing schemas)
   - subscriptionCreateSchema
   - orderCreateSchema
   - ipCampaignCreateSchema
   - etc.

3. **src/lib/api.ts** (or your fetch wrapper)
   - Get CSRF token on app load
   - Add X-CSRF-Token to all requests
   - Handle 403 CSRF errors

4. **src/App.tsx**
   - Add ErrorBoundary wrapper

5. **supabase/migrations/** (database changes)
   - Apply 20260405_rls_policies_production.sql
   - Add idempotency_key column to orders
   - Add database constraints

---

## 🔗 RELATED FILES

- Full audit: `AUDIT_AND_PRODUCTION_READINESS_APRIL10_2026.md`
- Existing fixes templates: `FIXES/` directory
- CSRF template: `FIXES/01_csrf_protection_server.js`
- Validation template: `server/validation.js`
- RLS migration template: `supabase/migrations/20260405_rls_policies_production.sql`

---

## 📞 SUPPORT

**Questions?** Check the full audit document: `AUDIT_AND_PRODUCTION_READINESS_APRIL10_2026.md`

**Last updated:** April 10, 2026  
**Status:** Ready for action
