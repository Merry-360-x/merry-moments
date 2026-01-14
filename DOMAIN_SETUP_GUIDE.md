# Custom Domain Setup Guide - merry360x.com

## Current Status
- ✅ DNS Records: Correctly configured
- ✅ SSL Certificate: Active and working
- ✅ www.merry360x.com: Working perfectly
- ❌ merry360x.com: Redirecting to www (needs to be added to project)

## Fix: Add Domain to Vercel Project

### Step 1: Open Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project: **merry-moments**

### Step 2: Add Custom Domain
1. Click on **Settings** tab
2. Click on **Domains** in the left sidebar
3. Click **Add** button
4. Enter: `merry360x.com`
5. Click **Add**

### Step 3: Configure Both Domains
After adding, you should see both:
- `merry360x.com` (root domain)
- `www.merry360x.com` (subdomain)

### Step 4: Set Primary Domain
1. Choose which domain should be primary:
   - Option A: `merry360x.com` (root) - cleaner URLs
   - Option B: `www.merry360x.com` (www subdomain)
2. Click the three dots (•••) next to your preferred domain
3. Select **Set as Primary Domain**

### Step 5: Configure Redirect (Recommended)
Set up automatic redirect from non-primary to primary:
- If primary is `merry360x.com`:
  - www.merry360x.com → merry360x.com
- If primary is `www.merry360x.com`:
  - merry360x.com → www.merry360x.com

This ensures all traffic goes to one canonical URL.

## Current DNS Configuration (Already Correct)

### Root Domain (merry360x.com)
```
Type: A
Name: @
Value: 216.198.79.1
```

### WWW Subdomain (www.merry360x.com)
```
Type: CNAME
Name: www
Value: 53d593af90aeeaca.vercel-dns-017.com
```

## Verification

After adding the domain in Vercel dashboard, verify both URLs work:

### Test Root Domain
```bash
curl -I https://merry360x.com
# Should return HTTP 200 or redirect to www
```

### Test WWW Subdomain
```bash
curl -I https://www.merry360x.com
# Should return HTTP 200
```

### Test in Browser
1. Open: https://merry360x.com
2. Open: https://www.merry360x.com
3. Both should work and show your application

## Alternative: Use Vercel Dashboard Link

Direct link to add domain:
https://vercel.com/fasts-projects-5b1e7db1/merry-moments/settings/domains

## Troubleshooting

### If domain doesn't work after adding:
1. Wait 5-10 minutes for DNS propagation
2. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. Check SSL certificate is provisioned (usually takes 1-2 minutes)

### If you see "Invalid Configuration":
- Verify DNS records match the values above
- Wait for DNS propagation (can take up to 48 hours, usually 5-10 minutes)

### If you see "Domain Not Found":
- Check domain ownership verification in Vercel
- Ensure domain is not registered with another Vercel team/account

## Expected Result

After setup, both URLs should work:
- ✅ https://merry360x.com → Your app (or redirects to www)
- ✅ https://www.merry360x.com → Your app
- ✅ Production Vercel URL still works as backup

## Notes

- Your Vercel deployment URL (`merry-moments-*.vercel.app`) will continue to work
- SSL certificates are automatically provisioned by Vercel
- Changes may take 5-10 minutes to propagate globally
- You can have multiple domains pointing to the same project

---
**Setup Date:** January 14, 2026
**Status:** DNS Configured ✅ | Domain Assignment Pending ⏳
