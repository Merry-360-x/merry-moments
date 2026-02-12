# Hotel Calendar Sync Guide (Anti Double-Booking)

This adds a real **hotel calendar sync API** using iCal feeds.

It solves the "physical + online double-booking" problem by importing external calendar reservations into `property_blocked_dates`, which your booking flow already respects.

## What was added

- `api/hotel-calendar-sync.js`
  - Create/list/delete integrations
  - Manual sync per integration
  - Scheduled sync for all active integrations
- `api/hotel-calendar-feed.js`
  - Tokenized read-only iCal feed for each property
  - Hotels/PMS can subscribe to this feed
- `supabase/migrations/20260213090000_add_property_calendar_integrations.sql`
  - Stores external iCal connections and secure feed tokens
- `vercel.json`
  - Cron every 30 min: `/api/hotel-calendar-sync?action=sync-all`

## Required environment variables

Set these in Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CALENDAR_SYNC_CRON_SECRET` (optional but recommended if you call cron endpoint outside Vercel Cron)
- `SITE_URL` (optional; used for returned feed URLs)

## API usage

All authenticated actions require `Authorization: Bearer <supabase_access_token>` from a logged-in host account.

### 1) Create integration (host)

`POST /api/hotel-calendar-sync?action=create`

Body:

```json
{
  "propertyId": "<property-uuid>",
  "feedUrl": "https://example.com/hotel.ics",
  "label": "Front desk calendar"
}
```

Response includes:

- `integration.id`
- `integration.feed_token`
- `integration.export_url` (share this URL to external systems that need your availability feed)

### 2) List integrations (host)

`GET /api/hotel-calendar-sync?action=list&propertyId=<property-uuid>`

### 3) Sync one integration now (host)

`POST /api/hotel-calendar-sync?action=sync`

Body:

```json
{
  "integrationId": "<integration-uuid>"
}
```

### 4) Delete integration (host)

`POST /api/hotel-calendar-sync?action=delete`

Body:

```json
{
  "integrationId": "<integration-uuid>"
}
```

### 5) Scheduled sync (system)

`GET /api/hotel-calendar-sync?action=sync-all`

- Automatically called by Vercel Cron every 30 minutes.
- Also accepted if called manually with:
  - Vercel cron header `x-vercel-cron: 1`, or
  - `?secret=<CALENDAR_SYNC_CRON_SECRET>`

## Feed export endpoint

`GET /api/hotel-calendar-feed?token=<feed_token>`

- Returns a standard iCal feed (`text/calendar`)
- Includes:
  - active bookings (`pending`, `confirmed`, `completed` with `pending/paid` payment states)
  - manual blocked dates
- Excludes imported external-sync blocks to prevent loopback duplication

## Important behavior

- External imports are written into `property_blocked_dates` with reason:
  - `External Sync:<integration-id>`
- On each sync, previous rows from that integration are replaced before inserting fresh feed data.
- This keeps your availability current and prevents stale blocks.
