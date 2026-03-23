# Flutter-Only Migration Plan

This repository now includes a new Flutter-first app shell in [merry360x_flutter](merry360x_flutter).

## Current Flutter Entry Point

- App root: [merry360x_flutter/lib/main.dart](merry360x_flutter/lib/main.dart)
- Test: [merry360x_flutter/test/widget_test.dart](merry360x_flutter/test/widget_test.dart)

## Migration Goal

Move all customer-facing and operations-facing apps into Flutter so one codebase serves Android, iOS, and Web.

## Module Mapping (React -> Flutter)

- Discovery and Search:
  - [src/pages/Index.tsx](src/pages/Index.tsx)
  - [src/pages/SearchResults.tsx](src/pages/SearchResults.tsx)
  - [src/components/HeroSearch.tsx](src/components/HeroSearch.tsx)
  - Target: `features/discover`

- Booking and Checkout:
  - [src/pages/Checkout.tsx](src/pages/Checkout.tsx)
  - [src/pages/TripCart.tsx](src/pages/TripCart.tsx)
  - [src/pages/BookingSuccess.tsx](src/pages/BookingSuccess.tsx)
  - Target: `features/bookings`

- Hosting and Listings:
  - [src/pages/HostDashboard.tsx](src/pages/HostDashboard.tsx)
  - [src/pages/CreateTour.tsx](src/pages/CreateTour.tsx)
  - [src/pages/CreateTransport.tsx](src/pages/CreateTransport.tsx)
  - Target: `features/host`

- Support and Operations:
  - [src/pages/CustomerSupportDashboard.tsx](src/pages/CustomerSupportDashboard.tsx)
  - [src/components/SupportChat.tsx](src/components/SupportChat.tsx)
  - Target: `features/support`

- Account and Security:
  - [src/pages/Auth.tsx](src/pages/Auth.tsx)
  - [src/pages/ForgotPassword.tsx](src/pages/ForgotPassword.tsx)
  - [src/pages/CompleteProfile.tsx](src/pages/CompleteProfile.tsx)
  - Target: `features/account`

## Backend and API Reuse

Keep existing API and Supabase services for now:

- [api](api)
- [supabase/functions](supabase/functions)

Flutter app should consume these endpoints while UI is migrated.

## Recommended Next Steps

1. Create a Flutter feature folder structure under [merry360x_flutter/lib](merry360x_flutter/lib).
2. Add Supabase auth/session wiring in Flutter.
3. Port booking flow (trip cart -> checkout -> success) first.
4. Port host dashboard and payout workflow second.
5. Freeze React route additions once equivalent Flutter screens are live.
6. Decommission old web/mobile frontends after parity and smoke tests.
