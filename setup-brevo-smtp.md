# Brevo SMTP Configuration for Supabase

## Step 1: Get Brevo SMTP Credentials

1. **Sign up/Login to Brevo:** https://app.brevo.com
2. Go to **Settings** → **SMTP & API**
3. Find your SMTP credentials:
   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Port:** `587` (TLS) or `465` (SSL)
   - **Login:** Your Brevo account email
   - **SMTP Key:** Generate a new SMTP key

## Step 2: Configure Supabase SMTP (Dashboard Method)

1. Go to https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm
2. Navigate to **Settings** → **Auth** → **SMTP Settings**
3. Enable custom SMTP
4. Fill in:
   ```
   SMTP Host: smtp-relay.brevo.com
   SMTP Port: 587
   SMTP User: your-brevo-email@domain.com
   SMTP Password: your-smtp-key-from-brevo
   Sender Email: noreply@merry360x.com
   Sender Name: Merry Moments
   ```
5. Click **Save**

## Step 3: Update Email Templates

1. Go to **Authentication** → **Email Templates**
2. Update **Reset Password** template:
   - Copy from: `/Users/davy/merry-moments/email-templates/reset-password-email.html`
   - Paste into Supabase template editor
   - Save

3. Update **Confirm signup** template:
   - Copy from: `/Users/davy/merry-moments/email-templates/confirm-email.html`
   - Paste into Supabase template editor
   - Save

## Step 4: Test Email Sending

Run the test script to verify emails are working:

```bash
npm run test:reset-password
```

Or manually test by:
1. Go to your site: https://merry360x.com/forgot-password
2. Enter your email
3. Check inbox (and spam folder)

## Brevo Limits

**Free Plan:**
- 300 emails/day
- Brevo logo in emails

**Lite Plan ($25/month):**
- 100,000 emails/month
- No Brevo branding
- Better deliverability

## Alternative: Using Supabase CLI (Advanced)

If you want to configure via CLI instead of dashboard:

```bash
# Set environment variables
export BREVO_SMTP_HOST="smtp-relay.brevo.com"
export BREVO_SMTP_PORT="587"
export BREVO_SMTP_USER="your-email@domain.com"
export BREVO_SMTP_PASSWORD="your-smtp-key"

# Update Supabase config
supabase secrets set SMTP_HOST=$BREVO_SMTP_HOST
supabase secrets set SMTP_PORT=$BREVO_SMTP_PORT
supabase secrets set SMTP_USER=$BREVO_SMTP_USER
supabase secrets set SMTP_PASS=$BREVO_SMTP_PASSWORD
supabase secrets set SMTP_SENDER_NAME="Merry Moments"
```

**Note:** CLI secrets require Edge Functions or custom setup. For standard Auth emails, use the Dashboard method (Step 2).

## Troubleshooting

**Emails not arriving?**
- Check Brevo dashboard for send logs
- Verify SMTP credentials are correct
- Check spam folder
- Ensure sender email is verified in Brevo

**"Invalid credentials" error?**
- Regenerate SMTP key in Brevo
- Make sure using SMTP key, not API key (they're different)

**Rate limit errors?**
- Check Brevo usage dashboard
- Upgrade plan if hitting limits

## Email Template Variables (Supabase)

In your HTML templates, use these variables:

- `{{ .ConfirmationURL }}` - The reset/confirmation link
- `{{ .SiteURL }}` - Your site URL (https://merry360x.com)
- `{{ .Email }}` - User's email address

Example:
```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```
