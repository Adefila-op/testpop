# ✅ RLS POLICIES FIX - HOW TO APPLY

**Error:** `relation "campaigns" does not exist`
**Root Cause:** RLS script referenced non-existent tables
**Status:** ✅ FIXED

---

## **What Was Wrong**

The original RLS script referenced:
- ❌ `campaigns` table (doesn't exist - you use `ip_campaigns`)
- ❌ `users` table (doesn't exist in your schema)
- ❌ Generic wallet/address field names (you use specific columns)

## **What's Fixed**

✅ New migration file created: `supabase/migrations/20260405_rls_policies_production.sql`
✅ Uses correct table names: `ip_campaigns` instead of `campaigns`
✅ Uses correct column names: `buyer_wallet`, `creator_wallet`, etc.
✅ Uses `IF NOT EXISTS` to prevent duplicate policy errors
✅ Uses `IF EXISTS` for table checks (handles missing tables gracefully)

---

## **HOW TO APPLY THE FIX**

### **Option 1: Copy-Paste into Supabase Console (Recommended)**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy contents from: `supabase/migrations/20260405_rls_policies_production.sql`
5. Paste into Supabase SQL console
6. Click **Run**
7. ✅ Should complete without errors!

### **Option 2: Use Supabase CLI**

```bash
# Navigate to project directory
cd POPUP-master

# Run the migration
supabase migration up --linked

# Verify it applied
supabase migration list
```

### **Option 3: Use in Next Migration**

If you have Supabase migrations configured:
- The file `supabase/migrations/20260405_rls_policies_production.sql` is ready
- It will run automatically on next deploy

---

## **VERIFY IT WORKED**

After running the migration, test with this query in Supabase SQL editor:

```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('artists', 'drops', 'orders', 'subscriptions', 'products', 'ip_campaigns', 'audit_log')
ORDER BY tablename;
```

**Expected result:** All rows should show `rowsecurity = true`

```
 schemaname |   tablename   | rowsecurity
------------|---------------|-------------
 public     | artists       | t
 public     | audit_log     | t
 public     | drops         | t
 public     | ip_campaigns  | t
 public     | orders        | t
 public     | products      | t
 public     | subscriptions | t
(7 rows)
```

---

## **TEST THE POLICIES WORK**

### **Test 1: Public can see published drops**

```sql
-- Any user (no auth) can see this
SELECT id, title FROM drops WHERE status = 'published' LIMIT 5;
-- Should return results
```

### **Test 2: User cannot see other user's orders**

```sql
-- Logged in as: wallet_a
-- Try to see orders from wallet_b
SELECT * FROM orders WHERE buyer_wallet = '0xwalletb...';
-- Should return empty (RLS blocks it)
```

### **Test 3: Orders are immutable**

```sql
-- Try to update an order you placed
UPDATE orders SET status = 'refunded' WHERE id = 'order-123';
-- Should return: UPDATE 0 (no rows updated due to RLS)
```

---

## **WHAT EACH POLICY DOES**

| Policy | Table | Effect |
|--------|-------|--------|
| `drops_select_published` | drops | Anyone can read published drops |
| `drops_manage_own` | drops | Artists can edit their own drops |
| `orders_select_own` | orders | Users see only their own orders |
| `orders_prevent_update` | orders | Orders cannot be modified |
| `subscriptions_select_own` | subscriptions | Users see only their subscriptions |
| `subscriptions_prevent_update` | subscriptions | Subscriptions managed by backend only |
| `products_select_published` | products | Anyone can read published products |
| `products_manage_own` | products | Creators can edit their products |
| `campaigns_select_active` | ip_campaigns | Anyone can see active campaigns |
| `campaigns_manage_own` | ip_campaigns | Creators can manage their campaigns |
| `artists_select_public` | artists | Anyone can view public artist profiles |
| `artists_update_own` | artists | Artists can edit their own profile |
| `audit_log_*` | audit_log | Append-only logs, users see their own |

---

## **TROUBLESHOOTING**

### **Issue: "Permission denied"**

**Cause:** Missing GRANT statements
**Solution:** Run all the GRANT statements at bottom of migration

### **Issue: "Duplicate policy"**

**Cause:** Policies already exist from previous run
**Solution:** They're safe to run multiple times (using `IF NOT EXISTS`)

### **Issue: Some policies still not working**

**Cause:** Your JWT doesn't include 'wallet' or 'address' claims
**Solution:** Check what claims your auth token has:

```sql
SELECT auth.jwt();
-- Look for 'wallet' or 'address' fields
```

If missing, update the policies to use the correct field name.

---

## **NEXT STEPS**

1. ✅ Apply the migration above
2. ✅ Verify with test query
3. ✅ Continue with other fixes in production_readiness plan
4. ✅ All critical security fixes will be complete!

---

## **Files Updated**

- ✅ `FIXES/06_rls_policies_comprehensive.sql` - Corrected version
- ✅ `supabase/migrations/20260405_rls_policies_production.sql` - Ready to run

Both are now compatible with your actual schema!

