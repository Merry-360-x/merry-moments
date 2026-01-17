# Password Reset Guide

This project includes a complete password reset flow using Supabase Auth.

## For Users (Web UI)

### Reset Your Password

1. Go to the login page: `/auth`
2. Click "Forgot password?" below the password field
3. Enter your email address
4. Click "Send reset link"
5. Check your email for the password reset link
6. Click the link in the email
7. Enter your new password (minimum 6 characters)
8. Confirm the new password
9. Click "Reset password"
10. You'll be redirected to login with your new password

### Important Notes

- The password reset link expires in **1 hour**
- You must be connected to the internet to complete the reset
- If you don't receive the email, check your spam folder
- Make sure to use a strong password (minimum 6 characters)

## For Admins (CLI)

### Reset a User's Password via CLI

You can send a password reset email to any user from the command line:

```bash
# Using Node.js
node reset-password-cli.js user@example.com

# Or using Supabase CLI directly
supabase auth reset-password user@example.com
```

### Using Supabase Dashboard

1. Log in to your Supabase project dashboard
2. Go to Authentication → Users
3. Find the user you want to reset
4. Click the three dots (•••) menu
5. Select "Send password reset email"

## Technical Implementation

### Pages Created

- **`/forgot-password`** - Request password reset (enter email)
- **`/reset-password`** - Set new password (after clicking email link)

### How It Works

1. **Request Reset** (`ForgotPassword.tsx`)
   - User enters their email
   - Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
   - Supabase sends an email with a secure token
   - Shows confirmation message

2. **Reset Password** (`ResetPassword.tsx`)
   - User clicks link in email
   - Supabase validates the token in the URL
   - User enters new password
   - Calls `supabase.auth.updateUser({ password })`
   - Redirects to login

### Security Features

- ✅ Secure token-based authentication
- ✅ Token expires in 1 hour
- ✅ One-time use tokens
- ✅ Password validation (minimum 6 characters)
- ✅ Confirm password match check
- ✅ Show/hide password toggle
- ✅ Error handling with user-friendly messages

### Email Configuration

Password reset emails are sent through Supabase Auth. To customize the email:

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Email Templates
3. Select "Reset Password" template
4. Customize the email content and styling
5. Make sure the reset link points to: `{{ .SiteURL }}/reset-password`

### Environment Variables

Required in `.env`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=https://your-domain.com  # Optional, defaults to localhost
```

## Troubleshooting

### User doesn't receive reset email

1. Check Supabase Auth settings are enabled
2. Verify the email is correct
3. Check spam/junk folder
4. Ensure email sending is configured in Supabase
5. Check Supabase logs for delivery errors

### Reset link doesn't work

1. Link may have expired (1 hour limit)
2. Link may have already been used
3. Request a new reset link

### Password update fails

1. Ensure password is at least 6 characters
2. Check both passwords match
3. Verify you're still within the 1-hour token window
4. Check browser console for detailed errors

## Testing

### Test the Flow

1. Create a test user account
2. Go to `/forgot-password`
3. Enter the test user's email
4. Check email (or Supabase logs if using local development)
5. Click the reset link
6. Set a new password
7. Login with the new password

### Using Supabase Local Development

If using Supabase local development, emails are logged to the terminal:

```bash
supabase start
# Watch for email output in the logs
```

## API Reference

### Supabase Auth Methods Used

```typescript
// Send password reset email
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});

// Update password
const { error } = await supabase.auth.updateUser({
  password: newPassword,
});

// Get current session (to verify token)
const { data: { session } } = await supabase.auth.getSession();
```

## Routes

- `GET /forgot-password` - Request password reset page
- `GET /reset-password` - Reset password page (requires token in URL)
- `GET /auth` - Login page (with "Forgot password?" link)

## Components

- `ForgotPassword.tsx` - Request reset form
- `ResetPassword.tsx` - Set new password form
- `Auth.tsx` - Updated with "Forgot password?" link
