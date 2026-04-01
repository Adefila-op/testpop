# Quick Vercel Route Tests

After deployment completes (~1-2 minutes), test these URLs:

## 1. Frontend Loads
```
https://testpop-one.vercel.app
Expected: App UI displays (not blank, not 404)
```

## 2. Auth Challenge (Most Important)
```powershell
$body = @{ wallet = "0x4b393730efc0e3c1e0c0944fbf05edef4ee58092" } | ConvertTo-Json
Invoke-WebRequest -Uri "https://testpop-one.vercel.app/api/auth/challenge" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body $body
```
Expected: `200 OK` with `{ wallet, nonce, issuedAt, message }`

## 3. Health Check
```
https://testpop-one.vercel.app/api/health
Expected: 200 OK with `{ ok: true, service: "popup-api" }`
```

## 4. Admin Artists (requires auth token from challenge/verify)
```powershell
# First get auth token (see step 2)
# Then:
Invoke-WebRequest -Uri "https://testpop-one.vercel.app/api/admin/artists" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer <token-from-verify>" }
```
Expected: `200 OK` with artists list

## 5. File Upload to Pinata
```powershell
$file = Get-Item "path/to/test.jpg"
$form = @{ file = $file }
Invoke-WebRequest -Uri "https://testpop-one.vercel.app/api/pinata/file" `
  -Method POST `
  -Form $form `
  -Headers @{ "Authorization" = "Bearer <token>" }
```
Expected: `200 OK` with `{ cid, uri }`

## Check Deployment Status
https://vercel.com/Adefila-op/testpop/deployments

Look for latest deployment of commit `87f0669`. 
- Green checkmark = deployed ✅
- If log shows errors, let me know

## If Still Getting 404s
1. Check Vercel function logs (in deployment details)
2. Look for "INCOMING REQUEST" logs from my middleware
3. Share the exact status code + request details
4. Logs will show if route is being matched or if it's still missing
