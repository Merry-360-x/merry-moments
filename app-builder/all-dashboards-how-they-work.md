# All Dashboards: How They Work (AI Builder Reference)

This document explains every dashboard currently implemented in Merry Moments, including:
- who can access it
- route and guard behavior
- tabs and responsibilities
- data sources (Supabase tables/RPC)
- realtime refresh model
- key actions and workflows

Primary source files:
- `src/App.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/pages/HostDashboard.tsx`
- `src/pages/StaffDashboard.tsx`
- `src/pages/FinancialStaffDashboard.tsx`
- `src/pages/OperationsStaffDashboard.tsx`
- `src/pages/CustomerSupportDashboard.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/AffiliateDashboard.tsx`

---

## 1) Routing and Access Control

## Active role-guarded dashboards

| Route | Dashboard | Access Rule |
|---|---|---|
| `/dashboard` | User Dashboard | `RequireAuth` |
| `/host-dashboard` | Host Dashboard | `RequireRole(["host"])` |
| `/admin` | Admin Dashboard | `RequireRole(["admin"])` |
| `/financial-dashboard` | Financial Staff Dashboard | `RequireRole(["financial_staff", "admin"])` |
| `/operations-dashboard` | Operations Staff Dashboard | `RequireRole(["operations_staff", "admin"])` |
| `/customer-support-dashboard` | Customer Support Dashboard | `RequireRole(["customer_support", "admin"])` |

## Other related routes
- `/support-dashboard` -> redirects to `/customer-support-dashboard`
- `/affiliate-dashboard` -> no route-level guard in `App.tsx`, but page logic checks auth and affiliate enrollment and redirects to `/auth` or `/affiliate-signup`

## Legacy/alternate dashboard file
- `StaffDashboard.tsx` exists and is functional, but is not currently wired as an active route in `App.tsx`

---

## 2) Shared Dashboard System Pattern

All dashboard pages follow the same implementation pattern:
1. Tab-driven UI (`TabsTrigger` + `TabsContent`)
2. Data fetch via Supabase + React Query
3. Realtime subscription(s) with Supabase channels
4. Query invalidation on table changes
5. Dialog-based detail views and moderation actions
6. Optional currency conversion for cross-currency summaries (RWF-centered in financial contexts)

Common tools used repeatedly:
- `useQuery`, `useQueryClient`
- `supabase.from(...)`, `supabase.rpc(...)`
- `supabase.channel(...).on('postgres_changes', ...)`
- local tab/filter/search state

---

## 3) Admin Dashboard (`/admin`)

## Role and objective
- Role: `admin`
- Objective: full platform control (users, listings, bookings, payouts, safety, legal content, affiliate management)

## Tabs
- `overview`
- `ads`
- `host-applications`
- `users`
- `user-data`
- `accommodations`
- `tours`
- `transport`
- `bookings`
- `payments`
- `payouts`
- `reviews`
- `support`
- `safety`
- `reports`
- `legal-content`
- `affiliates`

## Data model and feeds
- RPC: `admin_dashboard_metrics`, `admin_list_users`
- Tables include: `host_applications`, `user_roles`, `profiles`, `properties`, `tours`, `tour_packages`, `transport_vehicles`, `bookings`, `checkout_requests`, `host_payouts`, `support_tickets`, reviews, and moderation-related entities

## Realtime behavior
- Subscribes to high-impact entities and invalidates matching query keys to keep operational queues current

## Key workflows
- Host application approval/rejection
- User role management and account moderation (suspend/unsuspend)
- Listing publish/unpublish and deletion actions
- Booking/payment/refund decision paths
- Payout review and status updates
- Support/safety/legal moderation
- Affiliate operations via `AffiliatesManagement`

---

## 4) Host Dashboard (`/host-dashboard`)

## Role and objective
- Role: `host`
- Objective: manage own inventory, bookings, revenue, payouts, reviews, and availability

## Tabs
- `overview`
- `properties`
- `tours`
- `transport`
- `bookings`
- `manual-reviews`
- `discounts`
- `financial`
- `payout-methods`
- `calendar-availability`

## Data model and feeds
- `host_applications` (host profile/completeness/service scope)
- `properties`, `tours`, `tour_packages`, `transport_vehicles`, `transport_routes`
- `bookings` (property/tour/transport)
- `checkout_requests` enrichment by `order_id`
- host payout method and schedule data

## Realtime behavior
- Subscriptions include bookings and inventory/review tables; updates trigger dashboard refresh/invalidation

## Key workflows
- Create/edit/publish/unpublish for properties, tours, transport
- Booking management, including confirmation-required flows
- Financial rollups with host earnings logic
- Payout method setup and payout tracking
- Calendar availability + iCal/ICS sync workflows

Important finance rule currently used in host reporting:
- host net calculation deducts a 3% platform fee from guest-paid amount

---

## 5) Financial Staff Dashboard (`/financial-dashboard`)

## Role and objective
- Roles: `financial_staff`, `admin`
- Objective: monitor booking/payment integrity, refunds, payouts, and revenue reporting

## Tabs
- `overview`
- `bookings`
- `payouts`
- `revenue`

## Data model and feeds
- RPC: `get_staff_dashboard_metrics`
- `bookings` (with joins for listing currencies)
- `checkout_requests` (enrichment by booking `order_id`)
- `host_payouts`
- `support_tickets` (used for refund reference matching)

## Realtime behavior
- Subscriptions on `bookings`, `checkout_requests`, and payout-related tables; invalidates metrics + queue queries

## Key workflows
- Detect and process payment/refund state changes
- Mark/track payout processing status
- Revenue summary by currency and normalized display
- Investigate booking records with order-level payment context

---

## 6) Operations Staff Dashboard (`/operations-dashboard`)

## Role and objective
- Roles: `operations_staff`, `admin`
- Objective: operational moderation of applications, listings, booking operations, and user data completeness

## Tabs
- `overview`
- `applications`
- `user-data`
- `bookings`
- `accommodations`
- `tours`
- `transport`

## Data model and feeds
- `host_applications`
- `profiles`
- `properties`
- `tour_packages`
- `transport_vehicles`
- `bookings`
- related checkout/order context where needed

## Realtime behavior
- Subscriptions for applications, properties, tours, transport, and bookings

## Key workflows
- Operational review of host applications
- Listing quality/publishability checks
- Booking queue review and issue handling
- Cross-entity detail dialogs for incident resolution

---

## 7) Customer Support Dashboard (`/customer-support-dashboard`)

## Role and objective
- Roles: `customer_support`, `admin`
- Objective: resolve user cases across accounts, bookings, and tickets

## Tabs
- `overview`
- `users`
- `bookings`
- `tickets`

## Data model and feeds
- `profiles` (support user list)
- `bookings` (support booking list)
- `support_tickets`
- `property_reviews` (context signals)

## Realtime behavior
- Subscriptions for profiles, bookings, support tickets, and reviews
- 30s refresh intervals are also used on key list queries

## Key workflows
- Open ticket details and respond to requester
- Update ticket status/priority/response metadata
- Booking-side support operations and refund coordination
- Optional notification hooks for refund status emails

---

## 8) User Dashboard (`/dashboard`)

## Role and objective
- Role: any authenticated user
- Objective: personal account center for profile, trips, favorites, and security actions

## Tabs
- `trips`
- `personal`
- `security`

## Data model and feeds
- `profiles`
- `favorites` (count and list)
- `trip_cart_items` (count)
- `bookings` (counts and list filtered by `guest_id`)

## Realtime behavior
- User-scoped subscriptions:
  - bookings filtered by `guest_id`
  - favorites filtered by `user_id`
  - trip cart filtered by `user_id`

## Key workflows
- Edit personal profile details and avatar
- Review upcoming/past trip activity
- Access saved stays and cart-linked flows
- Run account security actions (password reset flow)

---

## 9) Affiliate Dashboard (`/affiliate-dashboard`)

## Role and objective
- Role model: authenticated user with an affiliate record
- Objective: track referral link performance and commission earnings

## Tabs
- `overview`
- `referrals`
- `commissions`

## Data model and feeds
- `affiliates` (current user record)
- `affiliate_referrals`
- `affiliate_commissions` (+ booking linkage)

## Realtime behavior
- Subscriptions on referrals and commissions
- Auto invalidation of affiliate query keys

## Key workflows
- Referral link generation and copy action
- Conversion funnel tracking (clicks -> conversions)
- Pending vs approved commission computation
- Status-driven UI states (`pending`, `active`, `suspended`, `rejected`)

---

## 10) Staff Dashboard (file exists, currently not routed)

## File
- `src/pages/StaffDashboard.tsx`

## Role and objective
- Generic staff moderation dashboard (legacy/optional route wiring)

## Tabs
- `overview`
- `applications`
- `users`
- `accommodations`
- `tours`
- `transport`

## Data model and feeds
- RPC: `admin_dashboard_metrics`, `admin_list_users`
- `host_applications` pending queue
- listings and transport sources
- booking previews + refund info helpers

## Key workflows
- Approve host applications
- listing publish/unpublish
- listing moderation and deletes

---

## 11) Builder Implementation Notes

If you are rebuilding this system in an AI app builder, keep these invariants:
1. Enforce role checks both in route guards and backend policies.
2. Preserve tab-per-domain architecture (do not collapse all operations into one list).
3. Keep realtime invalidation table-mapped by dashboard responsibility.
4. Separate financial truth sources:
   - booking amount/currency
   - checkout request amount/currency
   and keep amount aligned with its source currency.
5. Keep host net fee logic consistent (3% platform deduction) unless product policy changes.
6. Use detail dialogs/actions rather than inline destructive actions for moderation safety.

This document is intended as the canonical “how dashboards work” reference for AI builder prompts and generated app parity checks.
