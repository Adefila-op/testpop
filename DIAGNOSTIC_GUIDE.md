# 404 Error Diagnostic Guide

## What to Test

After the latest deployment to `https://testpop-one.vercel.app`, please test these URLs and report the results:

### 1️⃣ **Test Frontend Loads**
```
Open: https://testpop-one.vercel.app
Expected: App UI loads without white page
Report: ✅ / ❌ with screenshot or error
```

### 2️⃣ **Test API Server Is Running**
```
GET: https://testpop-one.vercel.app/api/health
Expected: { "ok": true, "service": "popup-api", "env": "production" }
Report: Status code + response body
```

### 3️⃣ **Test Root Endpoint**
```
GET: https://testpop-one.vercel.app/api/
Expected: { "status": "API is running", ... }
Report: Status code + response body
```

### 4️⃣ **Test Auth Challenge (WITHOUT /api)**
```
POST: https://testpop-one.vercel.app/auth/challenge
Body: { "wallet": "0x4b393730efc0e3c1e0c0944fbf05edef4ee58092" }
Expected: { "wallet": "...", "nonce": "...", "issuedAt": "...", "message": "..." }
Report: Status code + response body
```

### 5️⃣ **Test Auth Challenge (WITH /api)**
```
POST: https://testpop-one.vercel.app/api/auth/challenge
Body: { "wallet": "0x4b393730efc0e3c1e0c0944fbf05edef4ee58092" }
Expected: Same as above
Report: Status code + response body
```

### 6️⃣ **Check Browser Console**
Open DevTools (F12) → Console tab
Report: Any errors shown

### 7️⃣ **Check Vercel Logs**
Visit: https://vercel.com/Adefila-op/testpop/deployments
Click on the latest deployment
Check "Logs" tab for any errors
Report: Paste last 20 lines of logs

---

## How to Run Tests

### Option A: Using cURL or PowerShell
```powershell
# Test health endpoint
Invoke-WebRequest -Uri "https://testpop-one.vercel.app/api/health" -Method GET

# Test auth challenge
$body = @{ wallet = "0x4b393730efc0e3c1e0c0944fbf05edef4ee58092" } | ConvertTo-Json
Invoke-WebRequest -Uri "https://testpop-one.vercel.app/api/auth/challenge" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body $body
```

### Option B: Using browser console
```javascript
// Test health endpoint
fetch('https://testpop-one.vercel.app/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Health:', d))
  .catch(e => console.error('❌ Error:', e));

// Test auth challenge
fetch('https://testpop-one.vercel.app/api/auth/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wallet: '0x4b393730efc0e3c1e0c0944fbf05edef4ee58092' })
})
  .then(r => r.json())
  .then(d => console.log('✅ Challenge:', d))
  .catch(e => console.error('❌ Error:', e));
```

---

## Current Status

### Latest Changes (Commit: 58f0ddb)
- ✅ Added comprehensive request logging with full details
- ✅ Added root endpoint `/` and `/api/` for testing
- ✅ Registered `/auth/challenge` and `/auth/verify` at BOTH `/` and `/api` paths
- ✅ Added helper functions for easier dual-path route registration

### Architecture
```
User Request: POST /api/auth/challenge
         ↓
Vercel Routes (/api/* → server/api/index.js)
         ↓
server/api/index.js exports Express app
         ↓
Express middleware logs request details
         ↓
Route matches: app.post("/api/auth/challenge", ...)
         ↓
Returns 200 with { wallet, nonce, issuedAt, message }
```

---

## Expected Logs After Fix

When a request comes in, you should see in Vercel logs:

```
────────────────────────────────────────────────────────────────────────────────
📥 INCOMING REQUEST
   method: POST
   originalUrl: /api/auth/challenge
   url: /api/auth/challenge
   path: /api/auth/challenge
   baseUrl: 
   hostname: testpop-one.vercel.app
   protocol: https
   ⚙️ REWRITING: /api/auth/challenge → /auth/challenge
   AFTER REWRITE: url=/auth/challenge, path=/api/auth/challenge
────────────────────────────────────────────────────────────────────────────────

📨 ROUTING: POST /auth/challenge (original path was /api/auth/challenge)
✅ Registered POST /auth/challenge and /api/auth/challenge
```

---

## Troubleshooting

### If you still get 404:
1. Check Vercel logs - what path is being logged?
2. Does it match one of our registered routes?
3. Is there a middleware error before routing?
4. Are duplicate /api routes actually registered?

### If you get 5xx errors:
1. Check the error message in response
2. Verify ENV vars are set in Vercel dashboard
3. Check Vercel logs for full error stack

### If CORS error occurs:
1. Check if origin is validated correctly
2. Make sure `FRONTEND_ORIGIN` env var includes your domain
3. Verify OPTIONS preflight handler runs first

---

## After Diagnosis

Please share:
1. **All test results** (status codes, responses)
2. **Browser console errors** (if any)
3. **Last 20 lines of Vercel logs**
4. **Screenshots** if applicable

This will help pinpoint exactly where the 404 is coming from!
