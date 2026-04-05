# 🚀 PRODUCTION DEPLOYMENT GUIDE

**Platform:** Artful Sparkle Vault (POPUP)
**Target:** Base Network (Mainnet)
**Timeline:** 2-3 weeks with these fixes

---

## **PHASE 1: PRE-DEPLOYMENT (Week 1-2)**

### **Step 1: Implement All Critical Fixes**
See `FIXES/` directory for all implementations.

**Checklist:**
- [ ] CSRF protection (server + client)
- [ ] Price verification (server-side)
- [ ] Idempotency keys
- [ ] Collection ownership verification
- [ ] JWT expiration (24h)
- [ ] RLS policies (all tables)
- [ ] Inventory locking
- [ ] Error boundaries
- [ ] Memory leak cleanup
- [ ] Query optimization
- [ ] Request timeouts

### **Step 2: Test All Fixes Locally**

```bash
cd POPUP-master

# Start backend
npm run server:dev

# In another terminal, start frontend
npm run dev

# Run tests (create if needed)
npm run test

# Check for TypeScript errors
npx tsc --noEmit
```

**Test critical flows:**
1. User registration & wallet connection
2. Browse drops
3. Checkout & payment processing
4. Order confirmation
5. Subscription management
6. Admin features

### **Step 3: Security Audit Checklist**

```
☐ CSRF Token Generation & Validation
  - [ ] GET /api/csrf-token returns token
  - [ ] POST without token returns 403
  - [ ] POST with valid token succeeds

☐ Price Verification
  - [ ] Modify localStorage prices (should fail)
  - [ ] Server price used, not client
  - [ ] Audit log captures attempts

☐ Idempotency Keys
  - [ ] Same key returns cached response
  - [ ] No duplicate orders created
  - [ ] Different keys create different orders

☐ JWT Tokens
  - [ ] Token expires after 24h
  - [ ] Refresh token works
  - [ ] Expired token returns 401
  - [ ] Auto-refresh on page (5min before expiry)

☐ RLS Policies
  - [ ] Users can't access other users' orders
  - [ ] Artists can't modify other artists' drops
  - [ ] Published drops visible to all
  - [ ] Admin can access all data

☐ Inventory
  - [ ] Can't oversell limited products
  - [ ] Concurrent orders handled correctly
  - [ ] Inventory never negative

☐ Collection Store
  - [ ] Can't add unowned NFTs
  - [ ] Ownership verified onchain
  - [ ] Fake NFTs rejected
```

### **Step 4: Load Testing**

```bash
# Install artillery for load testing
npm install -g artillery

# Create load test file: load-test.yml
# See: FIXES/load-test-example.yml

# Run test
artillery run load-test.yml

# Expected results:
# - <200ms p95 for GET endpoints
# - <500ms p95 for POST endpoints
# - Support 1000 concurrent users
# - <0.1% error rate
```

### **Step 5: Staging Deployment**

```bash
# Build frontend
npm run build

# Verify build succeeds
npm run preview

# Deploy to Vercel staging
vercel --prod --token $VERCEL_TOKEN --name popup-staging

# Test on staging
# - Run through all critical flows
# - Check error handling
# - Monitor performance
# - Verify environment variables
```

---

## **PHASE 2: PRE-LAUNCH (Week 3)**

### **Step 6: Environment Configuration**

Create `.env.production`:

```env
# API
VITE_SECURE_API_BASE_URL=https://popup.app/api
VITE_API_TIMEOUT=30000

# Blockchain
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=xxx  # Deployment key (keep secure!)

# Supabase (Production)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Wallet
VITE_WALLETCONNECT_PROJECT_ID=xxx
REOWN_PROJECT_ID=xxx

# Storage
VITE_PINATA_API_BASE_URL=https://api.pinata.cloud
PINATA_JWT=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/yyy
DATADOG_API_KEY=xxx

# Admin
ADMIN_SECRET=xxx (change this!)
JWT_SECRET=xxx (generate random 32+ char string)
```

### **Step 7: Database Migration to Production**

```bash
# Backup current database
supabase db pull > backup-$(date +%Y%m%d).sql

# Run all migrations
supabase migration up --linked

# Verify migrations applied
supabase migration list

# Check RLS is enabled
supabase db query "
  SELECT schemaname, tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public'"

# Expected: All tables should have rowsecurity = true
```

### **Step 8: Smart Contract Verification**

```bash
# Deploy contracts to mainnet
npx hardhat run scripts/deploy-mainnet.mjs --network base

# Verify contract source on Block Explorer
npx hardhat verify --network base CONTRACT_ADDRESS "Constructor Args"

# Test contract interactions
node scripts/verify-contract-mainnet.mjs

# Check:
- [ ] Contract deployed to correct mainnet address
- [ ] Owner is correct address
- [ ] All functions callable
- [ ] Correct fee configuration
- [ ] Correct artist addresses whitelist
```

### **Step 9: Monitoring & Alerting Setup**

**Set up Sentry:**
```bash
npm install @sentry/react @sentry/tracing

# Initialize in src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({ maskAllText: false }),
  ],
});
```

**Set up LogRocket:**
```bash
npm install logrocket

# Initialize in src/main.tsx
import LogRocket from 'logrocket';

LogRocket.init('org/app', {
  console: { shouldAggregateConsoleErrors: true },
  network: { requestSanitizer: req => req },
});
```

**Alerts to configure:**
- [ ] Error rate >1%
- [ ] API response time >2 seconds
- [ ] Database connection errors
- [ ] Failed transactions
- [ ] Price mismatches detected
- [ ] RLS violations attempted
- [ ] Inventory inconsistencies
- [ ] Failed email notifications

### **Step 10: Backup & Recovery Strategy**

```bash
# Automated backups (Supabase does this)
# Configure daily backups + Point-in-time recovery

# Database backup command
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h db.supabase.co \
  -U postgres \
  -d postgres \
  > backup-production-$(date +%Y%m%d).sql

# Smart contract backup
# Copy ABIs and deployment addresses to git
# Tag release: git tag production-v1.0.0

# Document recovery procedure
# (See RECOVERY.md)
```

### **Step 11: Create Incident Response Plan**

**Document in `INCIDENT_RESPONSE.md`:**

```markdown
# Incident Response Plan

## Incident Severity Levels
- P1 (Critical): Platform down or funds at risk
- P2 (High): Major feature broken or severe bugs
- P3 (Medium): Performance issues or minor bugs
- P4 (Low): Documentation or UX improvements

## Response Procedures

### P1 Incident
1. Page on-call engineer (3 min max)
2. Declare severity in #incidents channel
3. Start incident management call
4. Identify root cause
5. Implement mitigation within 1 hour
6. Deploy fix
7. Post-mortem within 24 hours

### P2 Incident
1. Alert team (30 min)
2. Triage severity
3. Create hotfix PR
4. Deploy to staging
5. Deploy to production
6. Monitor for 1 hour

### Rollback Procedure
1. Identify last known good commit
2. Revert to previous deployment
3. Clear CDN cache
4. Verify critical flows work
5. Post status update
```

---

## **PHASE 3: LAUNCH (Day 1)**

### **Step 12: Pre-Launch Checklist**

**24 Hours Before:**
- [ ] All critical systems tested
- [ ] Monitoring active
- [ ] Team trained
- [ ] On-call rotation assigned
- [ ] Incident response plan in place
- [ ] Backups verified and recent

**2 Hours Before:**
- [ ] Verify all environment variables correct
- [ ] Database fully migrated and tested
- [ ] Smart contracts deployed and verified
- [ ] CDN cache cleared
- [ ] Monitoring dashboards visible to team
- [ ] Team members in Slack/Discord

**30 Minutes Before:**
- [ ] Final sanity checks
  - User registration works
  - Drop minting works
  - Payment processing works
  - Order confirmation sent
- [ ] Scale up server capacity if needed
- [ ] Notify stakeholders we're going live

### **Step 13: Gradual Rollout**

**5% → 25% → 100%**

Don't launch all at once! Gradual rollout catches issues:

```
Time    | Traffic | Action
--------|---------|----------------------------------
00:00   | 5%      | Launch to 5% of users
        |         | Monitor for 15 minutes
        |         | Check error rate, latency, bugs
--------|---------|----------------------------------
00:15   | 25%     | If 5% OK, roll out to 25%
        |         | Monitor for 30 minutes
--------|---------|----------------------------------
00:45   | 100%    | If no issues, go to 100%
        |         | Continue monitoring
```

**How to implement in Vercel:**
```bash
# Deploy to production with canary routing
vercel deploy --prod

# Monitor error rates
# If error rate > 2%, rollback:
vercel rollback
```

### **Step 14: Launch Day Monitoring**

**Real-time Dashboards:**
- [ ] Error rate monitoring
- [ ] Transaction success rate
- [ ] API latency (p50, p95, p99)
- [ ] Database query performance
- [ ] Smart contract call success rate
- [ ] User signup/activity rate
- [ ] Payment processing success
- [ ] Active concurrent users

**Critical Metrics to Watch:**
```
ERROR RATE > 1% → Investigate immediately
API LATENCY > 2s → Check database, restart services
FAILED TXN > 5% → Check blockchain network, contracts
INVENTORY DIFF → Check for overselling
PRICE MISMATCH → Check price verification logic
CSRF FAILURES → Normal, OK <1 per 1000 requests
```

### **Step 15: Post-Launch SLA**

**First Hour:** Team on standby, 5-minute response time
**First 24 Hours:** Team monitoring, 15-minute response time
**Week 1:** Daily reviews, standard response times

---

## **TESTING CHECKLIST - CRITICAL FLOWS**

### **User Registration & Wallet**
```
[ ] User can connect wallet (MetaMask, WalletConnect, etc)
[ ] User can sign message
[ ] JWT token generated and stored
[ ] Token refreshed properly before expiry
[ ] Logout clears tokens
[ ] Can't access protected routes without token
```

### **Browse & Search**
```
[ ] Drops page loads quickly (<1000ms)
[ ] Search debounces and aborts previous requests
[ ] Filter works without N+1 queries
[ ] Pagination works
[ ] Artist profiles load
[ ] Mobile responsive
```

### **Purchase & Checkout**
```
[ ] Add to cart works
[ ] Cart persisted in localStorage
[ ] Checkout form validates
[ ] CSRF token present in request
[ ] Server verifies prices match
[ ] Cant modify price in localStorage
[ ] Payment succeeds
[ ] Transaction confirmed
[ ] Order created in database
[ ] Email sent
[ ] User sees order confirmation
```

### **Subscription**
```
[ ] Subscribe button appears
[ ] Subscription charged correctly
[ ] Recurring charged monthly
[ ] Can cancel subscription
[ ] Subscription status shows correctly
```

### **Admin Features**
```
[ ] Only admin can access admin panel
[ ] Can create new drops
[ ] Can manage artists
[ ] Can view analytics
[ ] Can moderate products
[ ] RLS prevents unauthorized access
```

### **Edge Cases**
```
[ ] Network error on checkout (retry works with idempotency)
[ ] Inventory runs out mid-checkout
[ ] User tries large purchase (quantity validation)
[ ] User tries to mint after drop closed
[ ] User tries to refund (policy check)
[ ] Admin tries unauthorized action (RLS blocks)
```

---

## **DEPLOYMENT COMMANDS**

```bash
# Build
npm run build:vercel

# Deploy to staging
vercel --scope=artful-sparkle-vault

# Deploy to production
vercel --prod --scope=artful-sparkle-vault

# Rollback if needed
vercel rollback --scope=artful-sparkle-vault

# View logs
vercel logs --prod --scope=artful-sparkle-vault

# Environment variables
vercel env ls
vercel env add VARIABLE_NAME
```

---

## **FINAL CHECKLIST**

Before clicking "Deploy to Production":

```
SECURITY
- [ ] CSRF protection enabled
- [ ] Price verification working
- [ ] JWT tokens expire
- [ ] RLS policies active
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] No secrets in environment variables

PERFORMANCE
- [ ] <200ms p95 for GET requests
- [ ] <500ms p95 for POST requests
- [ ] N+1 queries fixed
- [ ] Database indexes created
- [ ] CDN enabled for static assets
- [ ] Images optimized

RELIABILITY
- [ ] All async errors caught
- [ ] Error boundaries on pages
- [ ] Database backups working
- [ ] All monitoring alerts active
- [ ] Incident response plan documented
- [ ] Team trained on incident procedures

TESTING
- [ ] All critical flows tested
- [ ] Load test passed (1000 concurrent users)
- [ ] Security audit completed
- [ ] E2E tests pass
- [ ] Mobile tested
- [ ] Accessibility checked

DEPLOYMENT
- [ ] Environment variables configured
- [ ] Database migration ready
- [ ] Smart contracts verified
- [ ] Monitoring dashboards ready
- [ ] Team on-call scheduled
- [ ] Stakeholders notified
```

---

## **CONTACT & SUPPORT**

**On-Call Engineer:** [Name, Phone]
**Incident Channel:** #incidents
**Status Page:** status.popup.app
**Monitoring:** https://sentry.io/popup

---

**Deployment Date:** ___________
**Deployed By:** ___________
**Approved By:** ___________

**Sign-off:** All above items ✓ completed

