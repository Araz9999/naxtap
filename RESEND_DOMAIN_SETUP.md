# Resend Domain Setup Guide for naxtap.az

This guide will help you add and verify your domain `naxtap.az` in Resend to avoid the "domain not verified" error.

## Step 1: Add Domain in Resend Dashboard

1. **Login to Resend Dashboard**
   - Go to https://resend.com/login
   - Login with your Resend account

2. **Navigate to Domains**
   - Click on **"Domains"** in the left sidebar
   - Click **"Add Domain"** button

3. **Enter Your Domain**
   - Enter: `naxtap.az`
   - Click **"Add Domain"**

4. **Get DNS Records**
   - Resend will show you DNS records that need to be added
   - You'll see something like:
     ```
     Type: TXT
     Name: _resend
     Value: resend-domain-verification=xxxxx-xxxxx-xxxxx
     
     Type: MX
     Name: @
     Value: feedback-smtp.resend.com
     Priority: 10
     
     Type: TXT
     Name: @
     Value: v=spf1 include:resend.com ~all
     
     Type: CNAME
     Name: resend._domainkey
     Value: resend._domainkey.resend.com
     ```

## Step 2: Add DNS Records in Cloudflare

1. **Login to Cloudflare**
   - Go to https://dash.cloudflare.com
   - Select your domain `naxtap.az`

2. **Go to DNS Settings**
   - Click **"DNS"** in the left sidebar
   - Click **"Records"** tab

3. **Add Each DNS Record**

   **a) Domain Verification TXT Record:**
   - Click **"Add record"**
   - Type: `TXT`
   - Name: `_resend`
   - Content: `resend-domain-verification=xxxxx-xxxxx-xxxxx` (copy exact value from Resend)
   - TTL: `Auto` or `3600`
   - Click **"Save"**

   **b) SPF TXT Record (if not exists):**
   - Click **"Add record"**
   - Type: `TXT`
   - Name: `@` (or `naxtap.az`)
   - Content: `v=spf1 include:resend.com ~all`
   - TTL: `Auto` or `3600`
   - Click **"Save"**
   - ⚠️ **Note:** If you already have an SPF record, you need to modify it to include Resend:
     - Find existing SPF record
     - Add `include:resend.com` to it
     - Example: `v=spf1 include:_spf.google.com include:resend.com ~all`

   **c) MX Record (for receiving emails - optional but recommended):**
   - Click **"Add record"**
   - Type: `MX`
   - Name: `@` (or `naxtap.az`)
   - Mail server: `feedback-smtp.resend.com`
   - Priority: `10`
   - TTL: `Auto` or `3600`
   - Click **"Save"**

   **d) DKIM CNAME Record:**
   - Click **"Add record"**
   - Type: `CNAME`
   - Name: `resend._domainkey`
   - Target: `resend._domainkey.resend.com`
   - Proxy status: **DNS only** (gray cloud, not orange)
   - TTL: `Auto` or `3600`
   - Click **"Save"**

## Step 3: Verify Domain in Resend

1. **Wait for DNS Propagation**
   - DNS changes can take 5-60 minutes to propagate
   - Cloudflare usually propagates quickly (5-15 minutes)

2. **Check DNS Records**
   - You can verify DNS records are live using:
     - https://mxtoolbox.com/SuperTool.aspx
     - Enter your domain and check TXT, MX, CNAME records

3. **Verify in Resend Dashboard**
   - Go back to Resend Dashboard → Domains
   - Click on `naxtap.az` domain
   - Click **"Verify Domain"** button
   - Resend will check all DNS records
   - Status should change to **"Verified"** ✅

## Step 4: Update Environment Variables

Once your domain is verified, update your environment variables:

### For Development (`.env` in backend folder):
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Your Resend API key
EMAIL_FROM=noreply@naxtap.az      # Use your verified domain
EMAIL_FROM_NAME=NaxtaPaz
```

### For Production:
Update your production environment variables (Render/Railway/VPS) with:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@naxtap.az
EMAIL_FROM_NAME=NaxtaPaz
```

## Step 5: Test Email Sending

After updating environment variables:

1. **Restart your backend server**
2. **Test email sending** by:
   - Registering a new user
   - Requesting password reset
   - Any action that sends email

3. **Check Resend Dashboard**
   - Go to **"Emails"** section
   - You should see sent emails with status
   - Check logs for any errors

## Common Issues & Solutions

### Issue 1: "Domain not verified" error persists
- **Solution:** Wait longer for DNS propagation (up to 24 hours in rare cases)
- Check DNS records are correct in Cloudflare
- Verify all records match exactly what Resend shows

### Issue 2: SPF record conflict
- **Solution:** If you have multiple SPF records, combine them into one:
  ```
  v=spf1 include:_spf.google.com include:resend.com ~all
  ```
- Cloudflare only allows one SPF record per domain

### Issue 3: DKIM not working
- **Solution:** Make sure the CNAME record has **DNS only** (gray cloud) in Cloudflare
- Do NOT enable Cloudflare proxy (orange cloud) for DNS records

### Issue 4: Emails going to spam
- **Solution:** 
  - Make sure all DNS records are correct
  - Wait 24-48 hours for domain reputation to build
  - Use a subdomain like `noreply@naxtap.az` instead of root domain

## Email Address Options

Once verified, you can use any email address from your domain:
- `noreply@naxtap.az` (recommended for automated emails)
- `support@naxtap.az`
- `info@naxtap.az`
- `hello@naxtap.az`

All will work once the domain is verified!

## Quick Checklist

- [ ] Added domain `naxtap.az` in Resend
- [ ] Added `_resend` TXT record in Cloudflare
- [ ] Added/updated SPF TXT record in Cloudflare
- [ ] Added MX record in Cloudflare (optional)
- [ ] Added `resend._domainkey` CNAME record in Cloudflare (DNS only)
- [ ] Waited 5-15 minutes for DNS propagation
- [ ] Verified domain in Resend dashboard (status: Verified ✅)
- [ ] Updated `EMAIL_FROM` environment variable to `noreply@naxtap.az`
- [ ] Restarted backend server
- [ ] Tested email sending

## Need Help?

If you encounter issues:
1. Check Resend dashboard for specific error messages
2. Verify DNS records using https://mxtoolbox.com
3. Check Cloudflare DNS logs for any issues
4. Contact Resend support if domain verification fails after 24 hours



