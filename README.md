# Merry Moments

An Airbnb-style booking app for **accommodations, tours, and transport**.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment setup (required)

This app reads Supabase + Cloudinary settings from Vite env vars.

- Copy `env.example` to `.env.local`
- Fill in your real values (do not commit `.env.local`)

For Vercel deployments, you must set these in the Vercel project environment variables (so the deployed app uses the live Supabase instance):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For Cloudinary image uploads (Host Dashboard), you must set these as well:

- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET` (must be an **unsigned** upload preset)

## Supabase CLI (recommended)

This repo includes the Supabase CLI as a dev dependency, so you can run it with:

```sh
npm run supabase -- --version
```

Common commands:

```sh
# Optional: starts a LOCAL Supabase stack (only if you explicitly want local dev).
# If you want everything to stay live/hosted, do NOT run these.
npm run supabase:start
npm run supabase:status
npm run supabase:stop
```

If you prefer a global install on macOS:

```sh
brew install supabase/tap/supabase
```

## Apply migrations to the LIVE Supabase project (required)

This repo includes SQL migrations under `supabase/migrations/`. These do **not** automatically apply to your hosted Supabase project unless you run them.

Your Supabase project ref is the subdomain in your Supabase URL, e.g. `https://<project-ref>.supabase.co`.

### Option A: Supabase Dashboard (SQL Editor)

1. Open your Supabase project dashboard.
2. Go to **SQL Editor** → **New query**.
3. Paste and run the contents of:
	- `supabase/migrations/20260110194500_add_tours_transport_trip_cart.sql`

This creates the `tours`, `transport_*`, and `trip_cart_items` tables (plus RLS policies) used by the Tours/Transport/Trip Cart/Dashboard pages.

### Option B: Supabase CLI (remote push, no local DB)

This uses the hosted database only. Do **not** run `supabase start`.

```sh
# Login (opens a browser)
supabase login

# Link this repo to your hosted project
supabase link --project-ref <your-project-ref>

# Push all migrations in supabase/migrations to the hosted DB
supabase db push
```

After applying migrations, redeploy on Vercel so the live site uses the updated schema.

## Cloudinary CLI (optional)

Cloudinary’s official CLI is Python-based and uses the `cld` command:

```sh
pip3 install cloudinary-cli
cld config
```

To connect the CLI, export `CLOUDINARY_URL` from your Cloudinary dashboard (Account details). Example:

```sh
export CLOUDINARY_URL="cloudinary://<api_key>:<api_secret>@<cloud_name>"
cld ping
```

Note: the website does NOT use `CLOUDINARY_URL` (that would expose secrets). The website only uses the public `VITE_CLOUDINARY_*` vars for unsigned uploads.

You’ll configure it using the `CLOUDINARY_URL` environment variable from your Cloudinary dashboard.

## CLI connectivity checks (recommended)

These commands confirm your **hosted** integrations are reachable from your machine.

### Supabase (HTTP)

```sh
# Requires VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in your shell
curl -sS "$VITE_SUPABASE_URL/auth/v1/health" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" | cat

# Test reading public properties (will succeed only if RLS allows it)
curl -sS "$VITE_SUPABASE_URL/rest/v1/properties?select=id,title&limit=3" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" | cat
```

### Cloudinary (HTTP)

```sh
# Fetch a known image URL and ensure it returns 200
curl -I "https://res.cloudinary.com/<cloud_name>/image/upload/<public_id>.jpg"
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deploy

This repo is deployed with Vercel. Configure environment variables in Vercel, then deploy with:

```sh
npx --yes vercel deploy --prod --yes
```
