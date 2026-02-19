# Email Templates for Supabase

Beautiful, responsive email templates for Supabase Auth.

## How to Use

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Email Templates**
4. Select the template type (Confirm signup, Reset password, etc.)
5. Copy the HTML from the corresponding file in this folder
6. Paste it into the template editor
7. Click **Save**

## Available Templates

### 1. Confirm Email (`confirm-email.html`)

**Used for:** Email confirmation when users sign up

**Template type in Supabase:** `Confirm signup`

**Features:**
- Beautiful gradient header
- Clear call-to-action button
- Alternative text link for accessibility
- Security notice (24-hour expiration)
- Responsive design
- Professional footer

**Variables used:**
- `{{ .ConfirmationURL }}` - The confirmation link

---

### 2. Reset Password (`reset-password-email.html`)

**Used for:** Password reset requests

**Template type in Supabase:** `Reset Password`

**Features:**
- Security-focused design
- Prominent reset button
- Expiration notice
- Warning about ignoring if not requested
- Responsive layout

**Variables used:**
- `{{ .ConfirmationURL }}` - The password reset link

---

### 3. Magic Link (`magic-link-email.html`)

**Used for:** Passwordless login

**Template type in Supabase:** `Magic Link`

**Features:**
- Quick access design
- Security reminder
- Time-sensitive notification
- Mobile-friendly

**Variables used:**
- `{{ .ConfirmationURL }}` - The magic link

---

### 4. Email Change (`email-change.html`)

**Used for:** When users change their email address

**Template type in Supabase:** `Change Email Address`

**Features:**
- Clear confirmation requirement
- Security notice
- Both old and new email information

**Variables used:**
- `{{ .ConfirmationURL }}` - The email change confirmation link

---

## Customization

### Colors

The templates use a purple gradient (`#667eea` to `#764ba2`). To customize:

1. **Primary gradient:**
   ```css
   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
   ```
   Replace with your brand colors

2. **Button shadow:**
   ```css
   box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
   ```
   Update the rgba values to match your primary color

3. **Border accent:**
   ```css
   border-left: 4px solid #667eea;
   ```
   Update to your primary color

### Branding

Update these elements:
- Company name: "Merry 360 Experiences"
- Support email: support@merrymoments.com
- Copyright year and text
- Logo (add `<img>` tag in header)

### Adding a Logo

Replace the header text with:

```html
<tr>
    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
        <img src="https://your-domain.com/logo.png" alt="Merry 360 Experiences" style="max-width: 200px; height: auto;">
        <h1 style="color: #ffffff; margin: 20px 0 0 0; font-size: 28px;">
            Welcome! 🎉
        </h1>
    </td>
</tr>
```

## Testing

Before deploying, test your emails:

1. **Supabase Dashboard Preview:**
   - Use the preview feature in Supabase email templates

2. **Send Test Email:**
   - Create a test user account
   - Trigger the email flow
   - Check rendering on different email clients

3. **Email Client Testing:**
   - Gmail (desktop & mobile)
   - Outlook
   - Apple Mail
   - Mobile devices

## Best Practices

✅ **Do:**
- Keep subject lines clear and concise
- Use clear call-to-action buttons
- Include plain text alternatives
- Test on multiple email clients
- Keep file size under 102KB
- Use inline CSS (required for email)
- Include security notices
- Provide alternative text links

❌ **Don't:**
- Use JavaScript
- Rely on external CSS files
- Use complex CSS (flexbox, grid)
- Forget to test on mobile
- Include large images
- Use background images (limited support)

## Supabase Variables

These variables are automatically replaced by Supabase:

| Variable | Description | Used In |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | Confirmation/action link | All templates |
| `{{ .Token }}` | OTP token | Invite, Magic Link |
| `{{ .TokenHash }}` | Token hash | Magic Link |
| `{{ .SiteURL }}` | Your site URL | All templates |
| `{{ .Email }}` | User's email | Email change |
| `{{ .NewEmail }}` | New email address | Email change |

## Troubleshooting

**Styles not working?**
- Email clients have limited CSS support
- Use inline styles only
- Avoid modern CSS features
- Test with [Litmus](https://litmus.com/) or [Email on Acid](https://www.emailonacid.com/)

**Links not working?**
- Check the redirect URL in Supabase settings
- Verify the `{{ .ConfirmationURL }}` variable is correct
- Ensure your site URL is configured

**Images not loading?**
- Use absolute URLs (https://)
- Host images on a CDN
- Keep image sizes small
- Provide alt text

## Support

For Supabase email template documentation:
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
