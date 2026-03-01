# Flutterwave Local Testing

Use this guide to test the new Flutterwave card endpoints end-to-end.

## Prerequisites

- Run the app/API locally: `npm run dev`
- Ensure `.env.local` contains:
  - `FLW_SECRET_KEY`
  - `FLW_PUBLIC_KEY`
  - `FLW_ENCRYPTION_KEY`
  - `FLW_BASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_BASE_URL`
- (Optional, recommended) set `FLW_WEBHOOK_SECRET_HASH` and same hash in Flutterwave dashboard.

## 1) Create a checkout in app first

Start a booking flow until checkout record exists in `checkout_requests`, then copy the `id` as `CHECKOUT_ID`.

## 2) Initialize card payment

```bash
CHECKOUT_ID=<checkout_uuid> ./scripts/flutterwave-test.sh init
```

Expected: JSON with `success: true`, `txRef`, and `link`.
Open `link` in browser and complete test card flow.

## 3) Verify payment status

Use either `tx_ref` or `transaction_id` from Flutterwave redirect/result:

```bash
CHECKOUT_ID=<checkout_uuid> TX_REF=<tx_ref> ./scripts/flutterwave-test.sh verify
```

or

```bash
CHECKOUT_ID=<checkout_uuid> TRANSACTION_ID=<id> ./scripts/flutterwave-test.sh verify
```

Expected: `paymentStatus` should become `paid` when successful and amount/currency match.

## 4) Simulate webhook delivery

```bash
CHECKOUT_ID=<checkout_uuid> TX_REF=<tx_ref> FLW_WEBHOOK_SECRET_HASH=<hash> ./scripts/flutterwave-test.sh webhook
```

Notes:
- Webhook handler always re-verifies with Flutterwave API.
- Use a real `TX_REF` from an initialized/completed transaction.
- If `FLW_WEBHOOK_SECRET_HASH` is configured server-side, pass matching `verif-hash`.

## Direct curl examples

### Create payment

```bash
curl -X POST http://localhost:5173/api/flutterwave-create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutId":"<checkout_uuid>",
    "amount":1000,
    "currency":"RWF",
    "payerName":"Test User",
    "payerEmail":"test@example.com",
    "phoneNumber":"250788123456"
  }'
```

### Verify payment

```bash
curl "http://localhost:5173/api/flutterwave-verify-payment?checkoutId=<checkout_uuid>&tx_ref=<tx_ref>"
```

### Webhook simulation

```bash
curl -X POST http://localhost:5173/api/flutterwave-webhook \
  -H "Content-Type: application/json" \
  -H "verif-hash: <same_as_FLW_WEBHOOK_SECRET_HASH>" \
  -d '{
    "event":"charge.completed",
    "data":{
      "tx_ref":"<tx_ref>",
      "meta":{"checkout_id":"<checkout_uuid>"}
    }
  }'
```
