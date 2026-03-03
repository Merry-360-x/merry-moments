# Launching Step

This gets you to the first real app launch with the native screens already built in this workspace.

Current implementation status:
- Home screen wired for live listing fetch (after backend config)
- Booking screen wired for booking submit request (sample IDs must be replaced)
- Listing detail screen prepared for dynamic binding
- Auth/login gate implemented on iOS and Android
- Home → Book action links selected listing into booking flow

## 1) Android launch (immediate)

1. Open Android Studio.
2. Open folder: `merry360x_mobile/android-app`.
3. Let Gradle sync.
4. Run on emulator/device.

If Gradle wrapper is requested, run in terminal inside `android-app`:

```bash
gradle wrapper
./gradlew assembleDebug
```

Then run from Android Studio.

If `gradle` is not installed on your Mac (current state here), use Android Studio fallback:

1. New Project → Empty Activity (Jetpack Compose)
2. Set package to `com.merry360x.mobile`
3. Place it in `merry360x_mobile/android-app`
4. Keep generated wrapper files
5. Replace generated files with this workspace files under `app/src/main/java/com/merry360x/mobile/` and Gradle config files

## 2) iOS launch (SwiftUI source ready)

SwiftUI source is already prepared in:
- `ios-app/Merry360xMobile/Merry360xMobileApp.swift`
- `ios-app/Merry360xMobile/Theme/AppTheme.swift`
- `ios-app/Merry360xMobile/Views/HomeView.swift`
- `ios-app/Merry360xMobile/Views/ListingDetailView.swift`
- `ios-app/Merry360xMobile/Views/BookingView.swift`

### Create Xcode target once

1. Open Xcode → New Project → iOS App.
2. Product name: `Merry360xMobile`
3. Interface: `SwiftUI`, Language: `Swift`
4. Save project under `merry360x_mobile/ios-app/`.
5. Replace generated Swift files with the files above.
6. Run on iOS Simulator.

## 3) Shared API wiring

`shared-js` already includes Supabase client + listing/booking APIs.

Install dependencies:

```bash
cd merry360x_mobile/shared-js
npm install
npm run check
```

Use this layer as the single backend contract source for both native apps.

## 4) Backend live config

See `docs/BACKEND_CONFIG.md`.

## 5) End-to-end check (after config)

1. Launch app
2. Sign in with real user account
3. Home loads listings from backend
4. Tap `Book` on featured listing
5. Booking screen shows selected listing title
6. Submit booking request

## 6) Design tokens implemented

- Coral `#E2555A` actions
- White `#FFFFFF` backgrounds
- Gray `#F5F5F5` cards/sections
- Rounded controls + soft shadows
