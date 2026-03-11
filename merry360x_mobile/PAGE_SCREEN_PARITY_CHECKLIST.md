# Website to Mobile Parity Checklist

Last updated: 2026-03-11

## Summary
- Website routes in `src/App.tsx`: 65
- Android top-level tabs in `merry360x_mobile/android-app/app/src/main/java/com/merry360x/mobile/MainActivity.kt`: 5
- Android app-center modules in `merry360x_mobile/android-app/app/src/main/java/com/merry360x/mobile/ui/screens/AppCentersScreen.kt`: 33

## Context Parity Matrix

| Context | Website Coverage | Mobile Coverage | Status | Notes |
|---|---|---|---|---|
| Explore discovery | `/accommodations`, `/tours`, `/transport`, `/search` | `HomeScreen` with categories and search sheet | Partial | Search is not a dedicated results screen yet on mobile. |
| Listing details | `/properties/:id`, `/tours/:id` | `ListingDetailScreen` (wired from Explore flow) | Partial | Mobile uses one detail screen pattern, not split by listing type. |
| Booking and checkout | `/trip-cart`, `/checkout`, `/payment-pending`, `/payment-failed`, `/booking-success`, `/my-bookings` | `TripCartScreen`, booking module, checkout/payment modules in app center | Partial | Main tab flow now includes dedicated booking screen; checkout remains module-driven. |
| Host dashboard and tools | `/host-dashboard`, create routes | Host Studio modules | Matched by context | Functional modules exist for create flows and host operations. |
| Admin and staff dashboards | `/admin`, `/financial-dashboard`, `/operations-dashboard`, `/customer-support-dashboard`, `/bookings` | Backoffice modules | Matched by context | Module-based access mirrors role-based web areas. |
| Affiliate | `/affiliate-signup`, `/affiliate-dashboard`, `/affiliate` | Affiliate center modules | Matched by context | Coverage is aligned at feature level. |
| Legal and support | `/help-center`, `/privacy-policy`, `/terms-and-conditions`, `/refund-policy`, `/contact`, `/safety-guidelines` | Support and legal modules | Partial | Safety is grouped, not dedicated as its own module label. |
| Authentication lifecycle | `/auth`, `/auth/callback`, `/forgot-password`, `/reset-password`, `/complete-profile` | Auth bottom sheet login/signup | Missing parity | Callback/reset/complete profile are not dedicated mobile screens yet. |

## Route Group Mapping (Web -> Mobile)

### Core traveler flow
- `/` -> `HomeScreen`
- `/search` -> `SearchSheet` in `HomeScreen` (not full results page)
- `/properties/:id` and `/tours/:id` -> `ListingDetailScreen`
- `/trip-cart` -> `TripCartScreen`
- `/checkout` -> `AppCentersScreen` > `Bookings & Checkout` > `Checkout`
- `/payment-pending`, `/payment-failed`, `/booking-success` -> payment state modules in `AppCentersScreen`
- `/my-bookings` -> bookings module in `AppCentersScreen`

### Host and staff
- `/host-dashboard` and create routes -> `AppCentersScreen` > `Host Studio`
- `/admin`, `/financial-dashboard`, `/operations-dashboard`, `/customer-support-dashboard` -> `AppCentersScreen` > `Backoffice Center`

### Affiliate
- `/affiliate-signup`, `/affiliate-dashboard`, `/affiliate` -> `AppCentersScreen` > `Affiliate Center`

### Legal and help
- `/help-center`, `/privacy-policy`, `/terms-and-conditions`, `/refund-policy`, `/contact` -> `AppCentersScreen` > `Support & Legal`

## High-Priority Gaps
1. Dedicated mobile search results screen to mirror `/search` behavior.
2. Dedicated auth lifecycle screens for callback/reset/complete profile.
3. Dedicated safety guidelines destination mirroring `/safety-guidelines`.

## Implemented in this update
1. Explore flow now supports native screen progression: `Home -> ListingDetail -> Booking`.
2. Listing selection no longer jumps directly to trip cart.
3. Detail and booking now operate as first-class screens in `MainActivity`.
