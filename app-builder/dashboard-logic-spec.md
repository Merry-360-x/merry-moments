# Dashboard Logic Spec for AI Builder (Web + Mobile)

## Goal
Define the current dashboard behavior in Merry Moments so an app builder can recreate the same role-based dashboard system, data model usage, and operational logic across web and mobile.

This is the single source-of-truth document for dashboard implementation.

## Route and Role Access

| Route | Screen | Required Role(s) |
|---|---|---|
| /dashboard | User Dashboard | Authenticated user |
| /host-dashboard | Host Dashboard | host |
| /admin | Admin Dashboard | admin |
| /financial-dashboard | Financial Staff Dashboard | financial_staff or admin |
| /operations-dashboard | Operations Staff Dashboard | operations_staff or admin |
| /customer-support-dashboard | Customer Support Dashboard | customer_support or admin |
| /admin/roles | Admin Roles | admin |

Source: src/App.tsx

## Shared Dashboard Architecture
- Data layer: Supabase queries (from table), RPC functions (rpc), and React Query caching.
- Realtime layer: Supabase channels subscribed per dashboard area; on event, invalidate the related query keys.
- Action layer: mutation handlers for publish/unpublish, approve/reject, refund decisions, payouts, and deletions.
- State model: tab-driven UI, filters/search state, selected record dialogs, and optimistic refresh via query invalidation.

## Always-In-Sync Blueprint (Web <-> App)

### Where dashboards connect to the database
- Supabase client is imported from `src/integrations/supabase/client` in each dashboard page.
- Read queries use `supabase.from("table")` and `supabase.rpc("function")` inside React Query `queryFn` blocks.
- Write operations (approve/reject/publish/refund/payout/status changes) use `insert`, `update`, `upsert`, or `delete` directly against Supabase.

### How live sync is implemented
1. Each dashboard subscribes to relevant tables using `supabase.channel(...).on('postgres_changes', ...)`.
2. On realtime event, it invalidates one or more React Query keys with `queryClient.invalidateQueries(...)`.
3. Invalidated query keys refetch current state from Supabase and redraw the affected tab/list/cards.
4. Critical dashboards also use interval refresh (`refetchInterval`) as fallback.

### Exact dashboard connection map

#### Admin (`/admin`)
- RPC: `admin_dashboard_metrics`, `admin_list_users`
- Main tables: `host_applications`, `user_roles`, `profiles`, `properties`, `tours`, `tour_packages`, `transport_vehicles`, `bookings`, `checkout_requests`, `host_payouts`, `property_reviews`, `support_tickets`, `incident_reports`, `blacklist`, `ad_banners`, `legal_content`
- Realtime watched tables: `properties`, `tours`, `transport_vehicles`, `bookings`, `host_payouts`, `host_applications`, `user_roles`, `profiles`, `property_reviews`, `ad_banners`
- Core query keys: `admin_dashboard_metrics`, `admin-properties`, `admin-tours`, `admin-transport-vehicles`, `admin-bookings-direct`, `admin-host_payouts`, `admin-reviews-direct`, `admin-tickets`, `admin_ad_banners`

#### Host (`/host-dashboard`)
- Main tables: `host_applications`, `properties`, `tours`, `tour_packages`, `transport_vehicles`, `transport_routes`, `bookings`, `checkout_requests`, `discount_codes`, `airport_transfer_pricing`
- Realtime watched tables: `bookings`, `property_reviews`, `properties`, `tour_packages`, `transport_vehicles`
- Pattern: host inventory + host bookings + checkout enrichment by `order_id`, then host financial rollups and payout flows

#### Financial Staff (`/financial-dashboard`)
- RPC: `get_staff_dashboard_metrics`
- Main tables: `bookings`, `checkout_requests`, `host_payouts`, `support_tickets`
- Realtime watched tables: `bookings`, `checkout_requests`, `host_payouts`
- Core query keys: `financial_metrics`, `financial_bookings`, `financial-support-tickets-refunds`, `host_payouts`

#### Operations Staff (`/operations-dashboard`)
- Main tables: `host_applications`, `profiles`, `properties`, `tour_packages`, `transport_vehicles`, `bookings`
- Realtime watched tables: `host_applications`, `properties`, `tour_packages`, `transport_vehicles`, `bookings`
- Core query keys: `operations_applications`, `operations_properties`, `operations_profile_users`, `operations_tours`, `operations_transport`, `operations_bookings`, `operations_cart_checkouts`

#### Customer Support (`/customer-support-dashboard`)
- Main tables: `profiles`, `bookings`, `support_tickets`, `property_reviews`
- Realtime watched tables: `profiles`, `bookings`, `support_tickets`, `property_reviews`
- Core query keys: `support_users`, `support_bookings`, `support_tickets`, `support_reviews`

#### User (`/dashboard`)
- Main tables: `profiles`, `favorites`, `trip_cart_items`, `bookings`
- Realtime watched tables with row filters:
  - `bookings` filtered by `guest_id`
  - `favorites` filtered by `user_id`
  - `trip_cart_items` filtered by `user_id`
- Core query keys: `profile`, `favorites`, `trip_cart_items`, `bookings`

#### Affiliate (`/affiliate-dashboard`)
- Main tables: `affiliates`, `affiliate_referrals`, `affiliate_commissions`
- Realtime watched tables: `affiliate_referrals`, `affiliate_commissions`
- Core query keys: `affiliate`, `affiliate-referrals`, `affiliate-commissions`

#### Staff (file exists, currently not route-wired)
- RPC: `admin_dashboard_metrics`
- Main tables: `host_applications`, `properties`, `tours`, `tour_packages`, `transport_vehicles`, `transport_routes`, `bookings`, `checkout_requests`
- Core query keys: `staff_dashboard_metrics`, `staff_list_users`, `staff-properties`, `staff-tours`, `staff-transport-vehicles`, `staff-transport-routes`, `staff-recent-bookings`

### App sync contract (recommended)
- Keep query key names identical in mobile/web where possible for easier observability.
- Subscribe only to each role’s table set above; invalidate only affected query keys.
- For finance fields, keep amount and currency from the same source record (booking vs checkout) to avoid mismatch.
- Enforce authorization in both route guards and Supabase policies/RPC checks.

---

## Host Dashboard (src/pages/HostDashboard.tsx)

### Tabs
- overview
- properties
- tours
- transport
- bookings
- manual-reviews
- discounts
- financial
- payout-methods
- calendar-availability

### Core Reads
- host_applications: profile completeness and host service scope.
- properties by host_id.
- tours by created_by.
- tour_packages by host_id (mapped into the tours UI model).
- transport_vehicles by created_by.
- transport_routes.
- bookings (property, tour, transport slices).
- checkout_requests by order_id for payment totals/fees/currency metadata.

### Realtime Subscriptions
- bookings
- property_reviews
- properties
- tour_packages
- transport_vehicles

Behavior: any event triggers fetchData() to refresh host dashboard state.

### Key Business Logic
- Tour card supports View, Edit, Delete, and Publish/Unpublish toggle.
  - tours table: publish state via is_published.
  - tour_packages table: publish state via status (approved or draft).
- Net host earnings use a platform fee deduction:
  - host net = guest paid * (1 - 3/100).
- Earnings and payout calculations are normalized to RWF for financial summaries.
- Payout methods: up to 2 methods; supports mobile money and bank transfer.
- Calendar sync supports:
  - property-level availability calendar
  - iCal URL integration
  - ICS/ZIP import
  - sync now and remove integration actions

---

## Admin Dashboard (src/pages/AdminDashboard.tsx)

### Tabs
- overview
- ads
- host-applications
- users
- user-data
- accommodations
- tours
- transport
- bookings
- payments
- payouts
- reviews
- support
- safety
- reports
- legal-content
- affiliates

### Core Reads and RPC
- admin_dashboard_metrics RPC
- admin_list_users RPC
- host_applications
- user_roles
- properties, tours, transport_vehicles
- bookings, host_payouts
- reviews, support-related entities

### Realtime Subscriptions
- properties, tours, transport_vehicles, bookings, host_payouts, host_applications, user_roles, profiles, reviews, ad banners

### Key Admin Actions
- Approve/reject host applications
- Add/remove user roles
- Suspend/unsuspend users
- Toggle listing publication
- Deep delete entities
- Booking status and refund decisions
- Payout state management
- Support and safety moderation workflows

---

## Staff Dashboard (src/pages/StaffDashboard.tsx)

### Tabs
- overview
- applications
- users
- accommodations
- tours
- transport

### Core Reads
- host_applications (pending)
- staff_dashboard_metrics (via admin_dashboard_metrics RPC)
- staff_list_users (via admin_list_users RPC)
- properties, tours + tour_packages merge, transport vehicles/routes
- recent bookings + checkout enrichment

### Key Staff Actions
- Approve host application (approve_host_application RPC)
- Toggle published state for listings
- Delete listing rows by table

---

## Operations Staff Dashboard (src/pages/OperationsStaffDashboard.tsx)

### Tabs
- overview
- applications
- user-data
- bookings
- accommodations
- tours
- transport

### Core Reads
- operations_applications
- operations_properties
- operations_profile_users
- operations_tours
- operations_transport
- operations_bookings
- operations_cart_checkouts

### Realtime Subscriptions
- host_applications, properties, tour_packages, transport_vehicles, bookings

### Key Operations Actions
- Approve/reject host applications (approve_host_application RPC)
- Listing moderation (accommodation/tour/transport visibility management)
- Booking and refund operational decisions

---

## Financial Staff Dashboard (src/pages/FinancialStaffDashboard.tsx)

### Tabs
- overview
- bookings
- payouts
- revenue

### Core Reads and RPC
- financial_metrics from get_staff_dashboard_metrics RPC
- financial_bookings + checkout_requests enrichment
- financial support tickets tied to refunds
- host_payouts (filtered)

### Realtime Subscriptions
- bookings
- checkout_requests
- host_payouts

### Key Financial Actions
- Refund approve/decline with coordinated booking/payment updates
- Payout state handling and financial queue monitoring
- Revenue by currency reporting

---

## Customer Support Dashboard (src/pages/CustomerSupportDashboard.tsx)

### Tabs
- overview
- users
- bookings
- tickets

### Core Reads
- support_users
- support_bookings
- support_tickets
- support_reviews

### Realtime Subscriptions
- profiles, bookings, support_tickets, property_reviews

### Key Support Actions
- Update support ticket status
- Respond to tickets
- Refund decision helper for booking cases

---

## User Dashboard (src/pages/Dashboard.tsx)

### Areas
- profile
- trip activity
- favorites
- cart
- booking history

### Core Reads
- profiles (by user_id)
- favorites count/list
- trip_cart_items count
- bookings count/list

### Realtime Subscriptions
- bookings filtered by guest_id
- favorites filtered by user_id
- trip_cart_items filtered by user_id

### Key User Actions
- Edit profile details
- Navigate to trips/favorites/cart
- Track upcoming bookings

---

## Affiliate Dashboard (src/pages/AffiliateDashboard.tsx)

### Tabs
- overview
- referrals
- commissions

### Core Reads
- affiliate record by user
- affiliate_referrals
- affiliate_commissions

### Realtime Subscriptions
- affiliate_referrals
- affiliate_commissions

### Key Affiliate Logic
- Approved earnings and pending earnings computed from commission status.
- Referral activity and commission lifecycle shown in tabular form.

---

## Cross-Cutting Business Rules
- Host earning fee: 3% platform deduction from guest-paid amount.
- Currency normalization:
  - Host financial summary logic uses RWF normalization for aggregate totals.
- Publication states:
  - properties, tours, transport_vehicles: is_published boolean.
  - tour_packages: status (approved = published, draft = unpublished).
- Dashboard consistency pattern:
  - query key per slice
  - realtime invalidation on relevant table changes
  - mutation then invalidate/refetch

## AI Builder Implementation Checklist
1. Build role guards first (route-level and feature-level).
2. Implement tab-level data slices with separate query keys.
3. Add realtime channel subscriptions per dashboard table map.
4. Implement mutation handlers with optimistic UI + query invalidation.
5. Mirror publish-state model split (boolean vs status enum).
6. Implement host financial math in RWF and keep fee logic at 3%.
7. Add shared dashboard components (metrics cards, table actions, moderation dialogs).
8. Add audit-safe confirmations for destructive actions (delete, suspend, refund approval).

## Primary Source Files
- src/pages/HostDashboard.tsx
- src/pages/AdminDashboard.tsx
- src/pages/StaffDashboard.tsx
- src/pages/OperationsStaffDashboard.tsx
- src/pages/FinancialStaffDashboard.tsx
- src/pages/CustomerSupportDashboard.tsx
- src/pages/Dashboard.tsx
- src/pages/AffiliateDashboard.tsx
- src/App.tsx

---

## Mobile Implementation Scheme (Admin, Staff, Operations, Support)

### Objective
Provide a mobile implementation scheme so users can log in, be routed by role, see information lists, open details, and execute dashboard actions safely on phone.

### Login and Role Routing
1. User logs in via Supabase Auth.
2. App reads role from `user_roles` (or normalized role source used in web).
3. Route by role:
   - `admin` -> Admin Dashboard
   - `staff` -> Staff Dashboard (if enabled in your role model)
   - `operations_staff` -> Operations Dashboard
   - `customer_support` -> Support Dashboard
4. If multiple roles, priority:
   - `admin` > `operations_staff` > `customer_support` > `staff`
5. If no matching staff role, route to user home or show no-access state.

### Session Rules
- Store auth token in secure storage.
- On app relaunch, restore session and resolve role before rendering dashboard.
- On expiry/logout, clear secure storage and route to login.

### Mobile Navigation Model
- Bottom tabs (per dashboard): `Overview`, `Queue`, `Secondary`, `Profile`
- Global drawer/header entry: `All Services`
- Stack flow: List -> Detail -> Action modal/sheet -> Success/error feedback

### All Services Listing (Cross-Service)
Provide one shared mobile screen to list all service types in one feed.

Included service types:
- Accommodations (`properties`)
- Tours (`tours` + `tour_packages`)
- Transport (`transport_vehicles` + related routes/transfers)

Screen behavior:
- Grouped-by-type default + count badges
- Toggle grouped <-> flat feed
- Filters: type, status, owner, date, price range, currency
- Search: title, host name, location, service ID
- Sort: newest, oldest, price high-low, price low-high

Role access:
- `admin`: full list + all actions
- `operations_staff`: full list + moderation actions
- `staff`: full list + standard moderation actions
- `customer_support`: read-only list + detail view

Actions from list/detail:
- Open detail
- Publish/Unpublish (role dependent)
- Edit (role dependent)
- Delete (policy dependent)

### Mobile Screen Map by Role

#### Admin Mobile
- Overview: KPI cards (applications, tickets, payouts, flagged listings)
- Queue: host applications, refund/booking decisions, payout reviews
- Secondary: users, listing moderation, legal/support links
- Detail actions: approve/reject, suspend/unsuspend, role management, publish/unpublish, delete, refund, payout status actions

#### Staff Mobile
- Overview: pending applications, unpublished listings, recent issue signals
- Queue: pending host applications
- Secondary: listing moderation, users (if policy allows)
- Detail actions: approve/reject, publish/unpublish, delete

#### Operations Mobile
- Overview: applications, booking ops queue, moderation queue
- Queue: booking operations + refund operations queue
- Secondary: applications, user data, listings
- Detail actions: approve/reject, booking status actions, publish/unpublish

#### Support Mobile
- Overview: open tickets, SLA risk, unresolved booking issues
- Queue: support tickets
- Secondary: users and booking cases
- Detail actions: status update, respond, assign/resolve, booking support notes/refund helper

### Shared Mobile List/Detail Pattern
1. List: search, filter chips, sort, pagination/infinite scroll
2. Detail: status header, metadata blocks, timeline/activity
3. Action area: primary actions + destructive confirmation
4. Post-action: toast, optimistic cache update, server revalidation

### Mobile Service Contracts
Create role service modules:
- `adminDashboardService`
- `staffDashboardService`
- `operationsDashboardService`
- `supportDashboardService`

Each module should provide:
- `getOverviewMetrics()`
- `getQueueItems(params)`
- `getAllServices(params)`
- `getEntityDetail(id)`
- `performAction(payload)`

Suggested `getAllServices(params)` response:

```ts
{
  items: Array<{
    id: string,
    type: "accommodation" | "tour" | "tour_package" | "transport",
    title: string,
    ownerId: string,
    ownerName?: string,
    status: "published" | "unpublished" | "draft" | "approved",
    price?: number,
    currency?: string,
    location?: string,
    createdAt: string,
    updatedAt?: string
  }>,
  total: number,
  page: number,
  pageSize: number
}
```

Suggested action payload:

```ts
{
  entityType: "application" | "booking" | "listing" | "ticket" | "payout" | "user",
  entityId: string,
  action: string,
  reason?: string,
  metadata?: Record<string, unknown>
}
```

### Realtime and Sync (Mobile)
- Subscribe only to high-value channels for active queue screens.
- On realtime event: invalidate affected query key and refresh visible screen only.
- Fallback polling: 30–60s on critical lists when realtime unavailable.

### Permissions and Safety
- Enforce permissions in UI and backend (RLS/RPC/policies).
- Hide unauthorized actions in client.
- Backend remains final authorization source.
- Audit-log all mutation actions.

### MVP Build Order
1. Auth + role resolution + role-based routing
2. Shared list/detail/action mobile components
3. Support dashboard
4. Operations dashboard
5. Staff dashboard
6. Admin dashboard
7. Global `All Services` screen
8. Realtime tuning + offline resilience

### Mobile-Ready Acceptance Criteria
A role user can:
1. Log in
2. Auto-route to correct dashboard
3. View queue lists
4. Open detail screens
5. Execute authorized actions
6. See immediate feedback and updated state
