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
```

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
