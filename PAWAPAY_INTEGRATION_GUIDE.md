# PawaPay Integration Setup Guide

## 🚀 Quick Start

### 1. Environment Variables

Add to your `.env` file:

```bash
# PawaPay Production API
PAWAPAY_API_KEY=your_live_api_key_here
PAWAPAY_BASE_URL=https://api.pawapay.cloud

# Webhook URL (must be HTTPS and publicly accessible)
PAWAPAY_WEBHOOK_URL=https://merry360x.com/api/pawapay-webhook
```

### 2. Configure Webhook in PawaPay Dashboard

1. Log into [PawaPay Dashboard](https://dashboard.pawapay.io)
2. Go to **Settings** → **Webhooks**
3. Add webhook URL: `https://merry360x.com/api/pawapay-webhook`
4. Enable events:
   - ✅ `deposit.completed`
   - ✅ `deposit.failed`
   - ✅ `deposit.rejected`
   - ✅ `deposit.cancelled`

## 📋 How It Works

### Payment Flow

```
1. User clicks "Pay with MTN/Airtel"
   ↓
2. Frontend → /api/pawapay-create-payment
   ↓
3. Backend creates PawaPay deposit
   ↓
4. User receives USSD prompt on phone
   ↓
5. User enters PIN
   ↓
6. PawaPay → /api/pawapay-webhook (async)
   ↓
7. Webhook updates checkout_requests
   ↓
8. Frontend polls for status update
   ↓
9. Redirect to success/failure page
```

### Status Flow

| PawaPay Status | Our Status | User Sees |
|---------------|-----------|-----------|
| SUBMITTED | pending | "Processing..." |
| ACCEPTED | pending | "Processing..." |
| COMPLETED | paid | "Success! ✅" |
| FAILED | failed | "Payment failed ❌" |
| REJECTED | failed | "Payment rejected" |
| CANCELLED | failed | "Payment cancelled" |

## 🔐 Security Checklist

### ✅ Before Going Live

- [x] Live API key configured (not sandbox)
- [x] HTTPS enabled on all endpoints
- [x] Webhook URL is publicly accessible
- [x] API key is server-side only (never in frontend)
- [x] Webhook returns 200 status
- [x] Database updates are atomic
- [x] Failed payments are handled gracefully

### ❌ Common Mistakes to Avoid

1. **Using sandbox key in production** ❌
   - Always use live key for real money

2. **Expecting instant response** ❌
   - Payments are async - use webhooks!

3. **Not handling FAILED status** ❌
   - Always handle insufficient funds, etc.

4. **API key in frontend** ❌
   - Keep keys server-side only

5. **Not returning 200 from webhook** ❌
   - PawaPay will retry failed webhooks

## 🧪 Testing

### Test with Sandbox

```bash
# Use sandbox for testing
PAWAPAY_API_KEY=your_sandbox_key
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.cloud
```

### Test Insufficient Funds

Use PawaPay sandbox test numbers:
- **Success**: `250788000001`
- **Insufficient Funds**: `250788000002`
- **User Declined**: `250788000003`

### Monitor Webhooks

Check webhook delivery in:
- PawaPay Dashboard → Webhooks → Recent Deliveries
- Your server logs: `/api/pawapay-webhook`

## 📊 Database Schema

### checkout_requests table

```sql
{
  id: UUID,
  payment_status: 'pending' | 'paid' | 'failed',
  payment_method: 'mtn_momo' | 'airtel_money',
  dpo_transaction_id: string, -- PawaPay depositId
  total_amount: number,
  currency: string,
  email: string,
  name: string,
  metadata: {
    pawapay_webhook: {
      status: string,
      depositId: string,
      failureReason: object,
      received_at: timestamp
    }
  }
}
```

## 🔍 Debugging

### Check Payment Status

```javascript
// In browser console
await fetch('/api/pawapay-check-status?depositId=xxx&checkoutId=yyy')
  .then(r => r.json())
  .then(console.log);
```

### Check Webhook Logs

```bash
# View recent webhook events
vercel logs --follow
```

### Database Query

```sql
-- Check recent payments
SELECT 
  id,
  payment_status,
  payment_method,
  dpo_transaction_id as deposit_id,
  total_amount,
  created_at,
  metadata->'pawapay_webhook'->>'status' as pawapay_status
FROM checkout_requests
ORDER BY created_at DESC
LIMIT 10;
```

## 📞 Support

- **PawaPay Support**: support@pawapay.io
- **Documentation**: https://docs.pawapay.io
- **Dashboard**: https://dashboard.pawapay.io

## 🚨 Troubleshooting

### Payment stuck in "pending"

1. Check webhook is configured correctly
2. Check webhook URL is accessible (HTTPS)
3. Verify PawaPay is sending webhooks (Dashboard → Webhooks)
4. Check server logs for webhook errors

### "Insufficient funds" not showing

1. Ensure webhook handler updates status correctly
2. Check frontend is polling for status
3. Verify error messages are mapped correctly

### Webhook not receiving events

1. Verify webhook URL is HTTPS
2. Check firewall/security settings
3. Test webhook manually with curl
4. Check PawaPay webhook delivery logs

## 💡 Best Practices

1. **Always use webhooks** - Don't rely on polling alone
2. **Handle all statuses** - COMPLETED, FAILED, REJECTED, etc.
3. **Return 200 quickly** - Process webhook asynchronously if needed
4. **Log everything** - Debug issues easily
5. **Test thoroughly** - Use sandbox before going live
6. **Monitor actively** - Set up alerts for failed payments
7. **User feedback** - Show clear messages for each status

---

**Remember**: Payments are asynchronous. Webhooks are mandatory for production! 🎯
