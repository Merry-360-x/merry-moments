# PawaPay Mobile Money Integration

This project integrates PawaPay for mobile money payments in Rwanda (MTN MoMo, Airtel Money).

## Setup Instructions

### 1. Get PawaPay API Credentials

1. Sign up at [PawaPay](https://pawapay.cloud)
2. Get your API key from the dashboard
3. Note your environment (sandbox/production)

### 2. Configure Environment Variables

Add these to your Vercel environment variables or `.env` file:

```bash
# PawaPay Configuration
PAWAPAY_API_KEY=your_api_key_here
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.cloud  # or https://api.pawapay.cloud for production
```

### 3. Configure Webhook URL

In your PawaPay dashboard, set the webhook URL to:
```
https://merry360x.com/api/pawapay-callback
```

## API Endpoints

### Create Payment
**POST** `/api/pawapay-create-payment`

Request body:
```json
{
  "bookingId": "uuid",
  "amount": 10000,
  "currency": "RWF",
  "phoneNumber": "250788123456",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "paymentMethod": "mtn_momo"
}
```

Response:
```json
{
  "success": true,
  "depositId": "merry360-{bookingId}-{timestamp}",
  "status": "SUBMITTED",
  "message": "Payment initiated. Please complete the transaction on your phone.",
  "data": {
    "bookingId": "...",
    "depositId": "...",
    "amount": 10000,
    "currency": "RWF",
    "phoneNumber": "250788123456",
    "correspondent": "MTN_MOMO_RWA",
    "status": "SUBMITTED"
  }
}
```

### Webhook Callback
**POST** `/api/pawapay-callback`

PawaPay will send status updates to this endpoint.

## Supported Payment Methods

- **MTN MoMo** (`mtn_momo`) - MTN Mobile Money Rwanda
- **Airtel Money** (`airtel_money`) - Airtel Money Rwanda

## Payment Flow

1. User selects mobile money payment method (MTN/Airtel)
2. Frontend calls `/api/pawapay-create-payment`
3. PawaPay sends USSD push to user's phone
4. User enters PIN to complete payment
5. PawaPay sends webhook to `/api/pawapay-callback`
6. Booking status updated automatically

## Payment Statuses

- **SUBMITTED** - Payment request sent to mobile operator
- **ACCEPTED** - Mobile operator accepted the request
- **COMPLETED** - Payment successful (booking confirmed)
- **FAILED** - Payment failed
- **REJECTED** - Mobile operator rejected the request
- **CANCELLED** - User cancelled the payment

## Testing

### Sandbox Test Numbers

PawaPay provides test phone numbers for sandbox testing:
- MTN: Use any number starting with 250788
- Airtel: Use any number starting with 250733

## Database Schema

The `payment_transactions` table tracks all payment attempts:

```sql
- id (UUID)
- booking_id (UUID, references bookings)
- provider ('pawapay', 'dpo', 'stripe', 'manual')
- transaction_id (unique per provider)
- amount (DECIMAL)
- currency (TEXT, default 'RWF')
- status (pending, submitted, accepted, completed, failed, etc.)
- payment_method (mtn_momo, airtel_money, etc.)
- phone_number (TEXT)
- provider_response (JSONB)
- failure_reason (TEXT)
- created_at, updated_at (TIMESTAMP)
```

## Security

- API keys stored in environment variables
- RLS policies restrict transaction viewing
- Webhook endpoint validates payloads
- All sensitive data encrypted in transit

## Error Handling

Common errors:
- **400** - Invalid request (missing fields, wrong phone format)
- **404** - Booking not found
- **500** - Server error or PawaPay API error

## Support

- PawaPay Docs: https://docs.pawapay.cloud
- Technical Support: support@pawapay.cloud
