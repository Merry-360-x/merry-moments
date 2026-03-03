# Web → Mobile Parity Matrix

Status legend:
- ✅ Implemented in mobile workspace
- 🟡 Implemented with placeholder IDs/config required
- ⚪ Planned next

## Core user flow
- ✅ Auth login gate (iOS + Android)
- ✅ Home listing feed UI + live fetch wiring
- ✅ Listing detail UI
- ✅ Booking create flow wiring
- 🟡 Booking submit requires real user/property ids and backend config

## Payments
- ✅ Flutterwave payment init call wiring (iOS + Android)
- ⚪ Full payment callback/deep link completion flow
- ⚪ PawaPay payout UX flow screens

## Account and engagement
- ✅ Inbox notifications module wiring
- ✅ Wishlist module wiring
- ✅ Profile module with sign-out and saved items

## Host features
- ✅ Host properties list module wiring
- ⚪ Host create/update listing UI
- ⚪ Host booking management actions

## Platform readiness
- ✅ Separate mobile workspace
- ✅ iOS SwiftUI app source layout
- ✅ Android Compose app source layout
- 🟡 Android terminal wrapper generation blocked by missing local gradle CLI (Android Studio path available)
- 🟡 iOS requires Xcode target creation step in this workspace

## Design system
- ✅ Coral/White/Gray tokens
- ✅ Rounded controls and soft shadows
- ✅ Airbnb-like card hierarchy and spacing
