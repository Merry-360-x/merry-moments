# Mobile App ↔ Website Parity Tracker

Use this tracker to ensure the mobile app built in your app builder stays fully in sync with the website.

## How to use

- Update **Status** with: `Not Started`, `In Progress`, `Blocked`, `Done`, `Verified`
- Keep **Owner**, **ETA**, and **Blocker** current each week
- Mark **Verified** only after parity is confirmed on both web and mobile
- Prioritize all `P0` rows before releasing app production

## Release Gate (must all be true)

- [ ] All `P0` items are `Verified`
- [ ] No open blocker on Auth, Booking, Payment, or Permissions
- [ ] Financial calculations match between web and app in test scenarios
- [ ] Staging UAT passed for guest, host, staff/admin personas
- [ ] Monitoring alerts configured and tested

---

## A) Platform, Environments, and Backend Source

| ID | Priority | Work Item | Owner | ETA | Status | Blocker | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| A-01 | P0 | Connect app builder to same Supabase project as website |  |  | Not Started |  | App and web read/write same records |
| A-02 | P0 | Configure `dev`, `staging`, `prod` app environments |  |  | Not Started |  | Separate keys/URLs mapped correctly |
| A-03 | P0 | Enable schema sync checks before publish |  |  | Not Started |  | Publish blocked on schema mismatch |
| A-04 | P1 | Add API/version compatibility policy |  |  | Not Started |  | Older app versions keep working |
| A-05 | P1 | Add rollout + rollback checklist |  |  | Not Started |  | Rollback can be executed in < 15 min |

## B) Authentication and Session Parity

| ID | Priority | Work Item | Owner | ETA | Status | Blocker | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| B-01 | P0 | Email/password login + signup parity |  |  | Not Started |  | Same validation/errors as web |
| B-02 | P0 | Google OAuth parity (redirect/deep link callbacks) |  |  | Not Started |  | Successful login from app and return to correct screen |
| B-03 | P0 | Phone OTP send/verify parity |  |  | Not Started |  | OTP flow behavior matches web |
| B-04 | P0 | Password reset/recovery parity |  |  | Not Started |  | Reset link/OTP opens app and completes reset |
| B-05 | P0 | Session refresh + logout parity |  |  | Not Started |  | Expired session handled same as web |
| B-06 | P1 | Suspended/blocked/incomplete-profile handling |  |  | Not Started |  | Role/status edge cases match website behavior |

## C) Data Model and Permissions (RLS)

| ID | Priority | Work Item | Owner | ETA | Status | Blocker | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| C-01 | P0 | Map all core entities 1:1 (profiles/properties/tours/transport/bookings/reviews/favorites/payments) |  |  | Not Started |  | No missing required fields |
| C-02 | P0 | Enforce same role permissions as website |  |  | Not Started |  | Unauthorized actions denied identically |
| C-03 | P0 | Validate moderation/publication state enforcement |  |  | Not Started |  | Draft/unpublished items hidden same as web |
| C-04 | P1 | Add schema drift alert process |  |  | Not Started |  | Team notified on incompatible schema changes |

## D) Guest Flows (Search → Details → Booking)

| ID | Priority | Work Item | Owner | ETA | Status | Blocker | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| D-01 | P0 | Search/filter parity (location, guests, price, amenities, type, monthly mode) |  |  | Not Started |  | Same query returns same items |
| D-02 | P0 | Sorting parity (including newest-first properties) |  |  | Not Started |  | First-page order matches website |
| D-03 | P0 | Property details parity (media, host card, review highlights, related items) |  |  | Not Started |  | Same sections/data visible |
| D-04 | P0 | Booking flow parity (dates, guests, totals, validations) |  |  | Not Started |  | Same totals/errors/outcome |
| D-05 | P0 | Payment status pages parity (success/pending/failed/refunded) |  |  | Not Started |  | Status messaging + actions match |
| D-06 | P1 | Favorites/reviews/profile parity |  |  | Not Started |  | Data updates reflect on both clients |

## E) Host, Staff, and Admin Flows

| ID | Priority | Work Item | Owner | ETA | Status | Blocker | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| E-01 | P0 | Host dashboard totals parity |  |  | Not Started |  | Earnings/cards equal web values |
| E-02 | P0 | Earnings rule parity (`actual paid - 3%`) |  |  | Not Started |  | Net values match web reports/exports |
| E-03 | P0 | Listing create/edit parity for properties/tours/transport/packages |  |  | Not Started |  | Fields and validations match |
| E-04 | P0 | Tiered/multi-model pricing parity (time/group tiers, draft behavior) |  |  | Not Started |  | Same tier inputs produce same prices |
| E-05 | P1 | Staff/admin moderation actions parity |  |  | Not Started |  | Publish/unpublish/review workflows match |
| E-06 | P1 | Export/report parity (columns + totals) |  |  | Not Started |  | CSV/PDF values match website |

## F) Real-Time Sync, Offline, and Caching

| ID | Priority | Work Item | Owner | ETA | Status | Blocker | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| F-01 | P0 | Real-time subscriptions for booking/payment/status updates |  |  | Not Started |  | App reflects backend changes promptly |
| F-02 | P0 | Deterministic cache invalidation per entity |  |  | Not Started |  | No stale critical data after mutations |
| F-03 | P1 | Offline read strategy for key screens |  |  | Not Started |  | App usable for read-only scenarios offline |
| F-04 | P1 | Write queue + retry with idempotency |  |  | Not Started |  | No duplicate orders/mutations |
| F-05 | P1 | Conflict resolution strategy (server-authoritative) |  |  | Not Started |  | Concurrent updates handled predictably |

## G) Notifications and Deep Linking

| ID | Priority | Work Item | Owner | ETA | Status | Blocker | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| G-01 | P0 | Push notification parity with web events |  |  | Not Started |  | Same trigger rules across app/web |
| G-02 | P0 | Deep links route to exact target screens |  |  | Not Started |  | Booking/property/tour links open correctly |
| G-03 | P1 | Unread state sync between app and website |  |  | Not Started |  | Counts and read state stay consistent |
| G-04 | P1 | Notification preference center parity |  |  | Not Started |  | User controls apply on both clients |

## H) QA, UAT, and Production Readiness

| ID | Priority | Work Item | Owner | ETA | Status | Blocker | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| H-01 | P0 | Build parity test scripts for guest/host/admin flows |  |  | Not Started |  | Scripted checks pass for both platforms |
| H-02 | P0 | Financial golden tests (sample orders) |  |  | Not Started |  | Same totals/net values app vs web |
| H-03 | P0 | Staging UAT with real accounts |  |  | Not Started |  | Sign-off from product/ops |
| H-04 | P0 | Crash/analytics/latency monitoring configured |  |  | Not Started |  | Alerts fire and route to owners |
| H-05 | P1 | Two-release stability verification |  |  | Not Started |  | No critical parity regressions |

---

## Weekly Parity Review

| Week | Lead | P0 Verified | P0 Remaining | New Blockers | Notes |
|---|---|---:|---:|---|---|
| YYYY-MM-DD |  | 0 | 0 |  |  |

## Current Top Risks

| Risk | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|
|  |  |  |  | Open |
|  |  |  |  | Open |
|  |  |  |  | Open |

## Sign-off

| Area | Approver | Date | Decision | Notes |
|---|---|---|---|---|
| Product |  |  | Pending |  |
| Engineering |  |  | Pending |  |
| QA |  |  | Pending |  |
| Operations |  |  | Pending |  |
