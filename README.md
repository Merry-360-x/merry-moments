# Merry Moments

A platform for **accommodations, tours, and transport** bookings in Rwanda.

## Quick Start

```sh
# Install dependencies
npm i

# Start development server
npm run dev
```

## Environment Setup

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset

# Server-side payment envs (Vercel / API runtime)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FLW_SECRET_KEY=your_flutterwave_secret_key
FLW_PUBLIC_KEY=your_flutterwave_public_key
FLW_ENCRYPTION_KEY=your_flutterwave_encryption_key
FLW_BASE_URL=https://api.flutterwave.com/v3
FLW_WEBHOOK_SECRET_HASH=your_flutterwave_webhook_secret_hash
APP_BASE_URL=https://merry360x.com
```

Flutterwave webhook URL:

`https://your-domain.com/api/flutterwave-webhook`

Set the same secret hash in Flutterwave dashboard and `FLW_WEBHOOK_SECRET_HASH`.

Local test commands and examples are in:

- `FLUTTERWAVE_TESTING.md`

For Vercel, set these in project environment variables.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Query (TanStack Query)
- Supabase (Database + Auth)
- Cloudinary (Image Management)

## Performance

- No loading spinners - instant content display
- React Query with 5-10 minute cache
- Placeholder data for zero perceived latency

## Deploy

```sh
vercel --prod
```
