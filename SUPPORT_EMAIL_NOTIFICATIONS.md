# Support Ticket Email Notifications

## Overview
Automatic email notifications are sent to `support@merry360x.com` whenever a user creates a support ticket.

## Implementation

### 1. Database Trigger (Recommended)
The system uses a PostgreSQL trigger that automatically sends an email when a new ticket is inserted into the `support_tickets` table.

**Migration file:** `supabase/migrations/20260204000005_add_ticket_email_notification.sql`

The trigger:
1. Fires after a new ticket is created
2. Fetches user email and name from the database
3. Calls the `/api/support-email` endpoint with ticket details
4. Gracefully handles errors (won't prevent ticket creation if email fails)

### 2. Edge Function (Alternative)
A Supabase Edge Function is also available for more advanced email handling.

**Location:** `supabase/functions/send-ticket-email/index.ts`

To deploy:
```bash
supabase functions deploy send-ticket-email
```

### 3. API Endpoint
The email sending logic is in `/api/support-email.js` which uses Brevo (formerly Sendinblue) for email delivery.

## Configuration

### Environment Variables
Set these in your Supabase project settings or `.env` file:

```bash
BREVO_API_KEY=your_brevo_api_key_here
SUPPORT_EMAIL=support@merry360x.com
```

### Brevo Setup
1. Create a Brevo account at https://www.brevo.com
2. Generate an API key from Settings > API Keys
3. Add the API key to your environment variables
4. Verify the sender email `noreply@merry360x.com` in Brevo

## Email Template
The email includes:
- **Subject:** `🎫 [CATEGORY] Ticket Subject`
- **Category badge** with color coding
- **Ticket subject and message**
- **Customer details** (name, email, user ID)
- **Link to customer support dashboard**
- **Reply-to** set to customer's email

### Category Colors
- General: Blue (#3b82f6)
- Booking: Green (#10b981)
- Payment: Orange (#f59e0b)
- Technical: Purple (#8b5cf6)
- Account: Pink (#ec4899)

## Testing

### Manual Test
Create a ticket via the support center:
```javascript
// In browser console on merry360x.com
const { data, error } = await supabase
  .from('support_tickets')
  .insert({
    user_id: 'your-user-id',
    subject: 'Test Ticket',
    message: 'This is a test ticket',
    category: 'general',
    status: 'open'
  });
```

### Automated Test
Run the test script:
```bash
node test-support-chat.mjs
```

## Troubleshooting

### Email not sending?
1. Check Brevo API key is set correctly
2. Verify sender email is verified in Brevo
3. Check Supabase logs: `supabase functions logs send-ticket-email`
4. Check database logs for trigger warnings
5. Ensure `pg_net` or `http` extension is enabled in Supabase

### Database trigger not firing?
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_support_new_ticket';

-- View recent warnings
SELECT * FROM pg_stat_statements WHERE query LIKE '%notify_support%';
```

### Fallback: Client-side notification
If database triggers aren't working, the client already calls the API endpoint when creating tickets:

**File:** `src/components/SupportCenterLauncher.tsx` (line ~400)
```typescript
fetch("/api/support-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    category: "general",
    subject: messageText.slice(0, 50),
    message: messageText,
    userId: user.id,
    userEmail: user.email,
    userName,
  }),
}).catch(() => {});
```

## Email Deliverability
- Uses Brevo's transactional email service for high deliverability
- Reply-to is set to customer's email for easy responses
- Sender: `noreply@merry360x.com`
- Recipient: `support@merry360x.com`

## Future Enhancements
- [ ] Add email for ticket status changes
- [ ] Send customer confirmation email when ticket is created
- [ ] Add email for new messages in existing tickets
- [ ] Implement email threading for better conversation tracking
- [ ] Add email templates for different ticket categories
