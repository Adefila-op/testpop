# 🚀 Database Migration Execution Guide

**Date**: April 2, 2026  
**Status**: Ready to Execute  
**Impact**: Enables subscription expiry tracking and shares system integration

---

## ✅ TypeScript Build Status

**Result**: ✅ **SUCCESS - NO ERRORS**
- All 9 compilation errors fixed
- Build completed successfully
- Ready for deployment

---

## 📋 Pending Database Migrations

### **Migration 004**: Add Subscription Expiry Tracking
**File**: `supabase/migrations/004_add_subscription_expiry.sql`  
**Purpose**: Support 30-day renewable subscriptions

**What It Does**:
```sql
✅ Adds expiry_time column to subscriptions table
✅ Adds min_subscription_fee tracking
✅ Creates indexes for fast expiry lookups
✅ Adds helper functions:
   - is_subscription_active()
   - get_subscription_time_remaining()
   - renew_subscription()
```

**Features Unlocked**:
- 30-day expiring subscriptions
- Automatic renewal capability
- Expiry countdown tracking
- Minimum fee enforcement

---

### **Migration 005**: Complete Shares System Integration
**File**: `supabase/migrations/005_complete_shares_integration.sql`  
**Purpose**: Full shares fundraising system support

**What It Does**:
```sql
✅ Adds shares tracking columns to artists table:
   - shares_enabled (boolean)
   - shares_contract_address (varchar)
   - shares_contract_tx (varchar)
   - shares_campaign_active (boolean)
   - shares_target_amount (numeric)
   - shares_deployed_at (timestamp)

✅ Creates indexes for efficient querying
✅ Adds automatic timestamp update trigger
✅ Creates public view: artists_with_active_shares
✅ Adds helper functions:
   - deploy_artist_shares()
   - toggle_shares_campaign()
```

**Features Unlocked**:
- Artist equity share campaigns
- Share deployment tracking
- Campaign status management
- Investor discovery (via view)

---

## 🔧 How to Execute

### **Option A: Using Supabase Dashboard (Recommended)**

**Step 1**: Log in to Supabase
```
Go to: https://supabase.com
Login with your account
Select your project
```

**Step 2**: Navigate to SQL Editor
```
Click: SQL Editor (left sidebar)
```

**Step 3**: Run Migration 004
```
1. Click: + New query
2. Copy the entire contents of:
   supabase/migrations/004_add_subscription_expiry.sql
3. Paste into the editor
4. Click: Run
5. Wait for: "Execution completed"
```

**Step 4**: Run Migration 005
```
1. Click: + New query
2. Copy the entire contents of:
   supabase/migrations/005_complete_shares_integration.sql
3. Paste into the editor
4. Click: Run
5. Wait for: "Execution completed"
```

**Step 5**: Verify Success
```
1. In SQL Editor, run this query:
   SELECT * FROM artists LIMIT 1;
   
2. Check for new columns:
   ✅ shares_enabled
   ✅ shares_contract_address
   ✅ shares_campaign_active
```

---

### **Option B: Using Supabase CLI (For Developers)**

```bash
# Make sure you're in the project directory
cd "c:\Users\HomePC\Downloads\POPUP-master (20)\POPUP-master"

# Link to your Supabase project (if not already linked)
deno run --allow-all https://supabase.com/migrations/links

# Push migrations
deno run --allow-all https://supabase.com/migrations/push

# Verify status
deno run --allow-all https://supabase.com/migrations/status
```

---

## ✅ Verification Checklist

After running both migrations, verify everything:

```sql
-- Check subscriptions table has new columns
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'subscriptions'
AND column_name IN ('expiry_time', 'min_subscription_fee');

-- Check artists table has new shares columns
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'artists'
AND column_name IN ('shares_enabled', 'shares_contract_address', 'shares_campaign_active');

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'is_subscription_active',
  'get_subscription_time_remaining',
  'deploy_artist_shares',
  'toggle_shares_campaign'
);

-- Check view exists
SELECT table_name 
FROM information_schema.views
WHERE table_name = 'artists_with_active_shares';
```

---

## 🔍 Troubleshooting

### **Error: "relation 'subscriptions' does not exist"**
- **Cause**: Migration 001 (initial schema) wasn't run
- **Fix**: Make sure all prior migrations are executed first

### **Error: "column 'expiry_time' already exists"**
- **Cause**: Migration 004 was already executed
- **Fix**: This is OK - migrations are idempotent (safe to run again)

### **Error: "permission denied for schema public"**
- **Cause**: Insufficient Supabase permissions
- **Fix**: Contact project owner or ensure you're logged in as admin

### **Timeout errors**
- **Cause**: Large migration on small Supabase instance
- **Fix**: Wait a few minutes and retry, or increase request timeout

---

## 📊 Expected Results

### After Migration 004:
- ✅ Subscriptions can track expiry times
- ✅ 30-day renewable subscription logic works
- ✅ Minimum fees enforced per artist
- ✅ Helper functions available for smart contracts to reference

### After Migration 005:
- ✅ Artists table tracks shares deployment
- ✅ Share campaigns can be created and toggled
- ✅ Investor discovery view working
- ✅ Helper functions for shares operations

---

## 🚀 Next Steps After Migrations

Once migrations are successful:

1. **Frontend Can Now**:
   - Show subscription expiry in UI
   - Track renewal countdown
   - Implement share campaign launch forms
   - Display investor dashboards

2. **Backend Can Now**:
   - Query active subscriptions efficiently
   - Track shares campaign status
   - Support revenue distribution calculations

3. **Smart Contracts Can Now**:
   - Query database for subscription status
   - Update expiry times on renewal
   - Log share-related events

---

## 📞 If You Get Stuck

Check:
1. All prior migrations (001-003) executed
2. Supabase project is online
3. You have admin permissions
4. Network connection is stable

Then:
5. Screenshot the error
6. Check Supabase logs: Database > Logs
7. Review [AUDIT_AND_DEPLOYMENT_REPORT.md](../AUDIT_AND_DEPLOYMENT_REPORT.md)

---

**Status**: Ready to Execute  
**Time to Complete**: 5-10 minutes  
**Risk Level**: Low (non-destructive, additive changes)  
**Backup**: Supabase handles automatic backups
