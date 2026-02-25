# AI Builder – Full Mobile App Spec (Website Parity)

This document describes the website’s feature set as a mobile-app specification, so an AI app builder can generate the full app with parity.

## 0) Product Summary

Build a mobile app for a travel/experiences marketplace with:
- Guest discovery and booking of accommodations (properties), tours, and transport services.
- A trip cart and checkout flow with payment status handling.
- Accounts with roles: guest, host, staff (operations/financial/support), and admin.
- Host tools to create/manage listings and view bookings and earnings.
- Staff/admin dashboards to moderate, support customers, and manage operations.

Primary goals:
- Same data, same permissions, same booking totals, same statuses as the website.
- Newly uploaded properties appear first in public listing feeds.

## 1) Roles & Access

### Roles
- Guest (default authenticated user)
- Host (user who can create/manage listings)
- Staff (internal): operations staff, financial staff, customer support
- Admin (full platform control)

### Core access rules
- Public users can browse published listings and read public content.
- Only authenticated users can favorite, book, write reviews, and open support tickets.
- Hosts can only manage their own listings and see their own booking/earnings data.
- Staff/admin can access management dashboards per permission scope.

## 2) Global App Structure (Navigation)

Recommended navigation:
- Bottom tabs: Home, Accommodations, Tours, Transport, Account
- Cart is accessible from header icon (global) and from Details pages CTA.
- Staff/admin dashboards appear only for users with staff/admin roles.

Global UI capabilities:
- Search bar and filters on listing pages.
- Currency preference (used for display conversions where applicable).
- Localization/i18n strings used consistently across screens.

## 3) Authentication & Account

### Auth methods (parity with web)
- Email/password sign up
- Email/password sign in
- Google OAuth sign in
- Phone OTP (send + verify)
- Password reset/recovery

### Auth screens
- Auth landing (choose method)
- Email sign in / sign up
- Phone OTP: enter phone → send OTP → verify OTP
- Password reset: request reset → enter new password
- Callback/deep link handler screen for OAuth/reset

### Profile & onboarding
- Complete profile screen (required fields and “profile complete” status)
- Account screen:
  - Personal details
  - Preferences (currency)
  - Bookings shortcut
  - Favorites shortcut
  - Become a host shortcut (if not a host)
  - Sign out

## 4) Home & Discovery

### Home screen
- Featured sections (simple): quick links to accommodations/tours/transport
- Optional: “recommended” section based on popularity/high rating (do not override newest-first on accommodations listing page)

### Search behavior
- Search by title/location keywords.
- Filters apply before displaying results.

## 5) Accommodations (Properties)

### Accommodations listing screen
- Shows only published properties.
- Sorting: newest first (created_at descending) as primary ordering.
- If “nearby” mode is enabled, distance can be a tie-breaker but must not override newest-first ordering.

Filters supported:
- Price range (display currency)
- Property type
- Amenities
- Minimum rating
- Location text filter
- Guest count filter
- Rental duration mode:
  - All rentals
  - Monthly only
  - Monthly available
  - Nightly only

Pagination:
- Paginate results (12 per page in the current website behavior).

### Property details screen
Must include:
- Media gallery (images)
- Title, location
- Rating + review count
- Price display:
  - If monthly-only listing: show price per month
  - Else show price per night
- Core details: bedrooms, bathrooms, beds, max guests
- Amenities list
- Rules/policies (smoking/events/pets)
- Check-in/check-out time
- Host card (“Meet your host”): avatar, name, bio, hosting since, review stats
- Reviews preview and “All reviews” link
- Availability/date selection:
  - Select check-in/check-out
  - Select guests
  - Validate blocked dates
- Primary CTA states:
  - Missing inputs → prompt to select dates/guests
  - Valid → Continue to cart/checkout
  - Invalid/unavailable → CTA disabled with reason

### Favorites
- Favorite/unfavorite property
- Favorites list screen shows saved properties

### Property reviews
- Reviews list per property
- Host reviews page (host profile reviews summary)

## 6) Tours

### Tours listing screen
- Browse published tours
- Filters/search similar to accommodations (as supported by web)

### Tour details screen
- Media
- Title/location
- Host/guide info
- Pricing display supports multiple pricing models:
  - Flat per person
  - Time-based tiers
  - Group-size tiers
- Duration-first UX for time pricing: user chooses duration tier first, then sees price
- Availability/date selection (tour date/time)
- CTA to add to cart / book

### Tour packages
- Package listing/details
- Package pricing supports same multi-model/tier metadata as tours

## 7) Transport

### Transport listing screen
- Browse transport services (airport transfers, car rentals, etc.)
- Sorting and filters as supported by web

### Transport details screen
- Provider details
- Price model (base price / per day where applicable)
- Date/time selection
- CTA to add to cart / book

## 8) Trip Cart

### Trip cart screen
- Shows cart items across types: property, tour, transport
- Each cart item includes:
  - Type
  - Item title
  - Selected dates/time
  - Guests/participants
  - Price breakdown
  - Remove item
- Cart totals shown consistently
- CTA: Proceed to checkout

Cart rules:
- Cart persists for signed-in user.
- Cart recalculates totals when inputs change.

## 9) Checkout & Payments

### Checkout screen
Collect and confirm:
- Guest contact info (name, email, phone)
- Special requests
- Final totals (subtotal, fees, total)
- Payment method selection (matching website integration)

### Payment flows
- Create payment request
- Handle redirect/return from payment provider
- Payment status screens:
  - Success
  - Pending
  - Failed

### Booking record lifecycle
- Before payment: create booking record with pending payment status
- After payment confirmation (via webhook/status check): update booking to confirmed/paid
- Store:
  - payment_status
  - payment_method
  - paid amount (source of truth for financial reporting)
  - transaction reference

### Refunds
- If supported by operations: reflect refunded state and show refund messaging

## 10) My Bookings (Guest)

### My bookings list
- List bookings sorted newest first
- Filter tabs (optional): upcoming / past / cancelled

### Booking details
- Booking summary, status, dates, total
- Item details snapshot
- Payment status and transaction info
- Support CTA (open ticket)

## 11) Host Features

### Become a host
- Host application flow (basic info + listing intent)
- Status tracking: pending/approved/rejected

### Host dashboard
Includes:
- Manage listings: properties, tours, transport, packages
- Create/edit listing flows:
  - Save as draft (incomplete forms allowed)
  - Publish/unpublish
  - Media uploads
  - Pricing model editor (including tier arrays)
- Bookings management for host’s items
- Earnings and reporting:
  - Canonical rule: host net = actual paid amount minus 3%
  - Consistent totals across cards/exports

## 12) Staff/Admin Features

### Customer Support dashboard
- View recent users
- View recent bookings
- View support tickets
- Respond to tickets

### Operations staff dashboard
- Manage operational workflows: listings publish state, booking issues, assignments

### Financial staff dashboard
- Financial reporting: payments, payouts, refunds, reconciliation views

### Admin dashboard
- User and role management
- Listing moderation across types
- Review moderation
- Incident reports
- Payout approvals/management

(Staff/admin screens must be gated by roles.)

## 13) Support & Help Content

### Help Center
- FAQ-like content

### Support tickets
- Create ticket
- View ticket status
- Staff response thread

## 14) Affiliate Module

### Affiliate portal
- Affiliate signup
- Affiliate dashboard
- Referral/registration tracking

## 15) Stories / Content

### Stories
- View stories feed
- Create story (authenticated)

## 16) Legal & Policies

Include screens:
- Privacy Policy
- Terms and Conditions
- Refund Policy
- Safety Guidelines

## 17) Media Uploads

- Upload and manage images for listings
- Must support the same hosting as web (e.g., Cloudinary or storage bucket) and store returned URLs in listing records.

## 18) Notifications

- Email confirmations: booking confirmation, ticket confirmation, support email replies
- In-app notifications or push (if available in builder): booking status changes, payment success, ticket updates
- Deep links from notifications open correct screen (booking, property, tour, ticket)

## 19) Data Entities (High-Level)

The app builder must support these entity groups (names may differ in your backend):
- profiles (user profile)
- properties (accommodations)
- tours
- tour_packages
- transport
- bookings
- favorites
- property_reviews (and/or reviews)
- support tickets
- roles / user_roles
- payments / checkout records
- blocked/unavailable dates for properties

## 20) Critical Parity Rules (Non-Negotiable)

- New properties come first on accommodations listing.
- Booking totals and financial calculations must match the website exactly.
- Host earnings uses the same “actual paid - 3%” rule everywhere.
- Only published listings appear to public users.
- Role gating must match web.
- Payment status states and transitions must match web.

## 21) Builder Implementation Notes (Action/Workflow style)

For each screen, your AI builder should generate:
- Data source queries (with correct ordering)
- Mutations (create/update)
- Validation rules (required fields, availability checks)
- State handling (loading/error/empty)
- Navigation routes and deep links

Minimum workflows to implement:
- Auth workflows (all methods)
- Listing browsing + details for each type
- Cart creation/update
- Booking creation (pending)
- Payment create → return handler → status update
- Booking confirmation + email notification
- Favorites add/remove
- Reviews read/write (if enabled)
- Support ticket create/respond
- Host listing CRUD + publish
- Host earnings reporting

---

## Copy/Paste Prompt (for an AI App Builder)

Build a mobile app that matches an existing website marketplace. Implement authentication (email/password, Google OAuth, phone OTP, password reset), browsing of accommodations/tours/transport, details pages with availability selection, trip cart, checkout/payment status screens, bookings list/details, favorites, reviews, host dashboard (listing CRUD, draft/publish, tiered pricing, earnings = paid - 3%), and staff/admin dashboards gated by roles. Use a shared Supabase backend. Ensure accommodations list is newest-first (created_at descending) and nearby mode does not override newest-first ordering.
