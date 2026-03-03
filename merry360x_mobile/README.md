# Merry360x Mobile

Native-first mobile workspace for iOS (SwiftUI) and Android (Kotlin/Jetpack Compose), with shared JavaScript API/domain logic.

## Structure

- `shared-js/` Shared API/domain client logic for both apps
- `ios-app/` SwiftUI app source
- `android-app/` Kotlin Compose app source
- `docs/` Launch and integration guides

## Brand tokens

- Coral: `#E2555A`
- White: `#FFFFFF`
- Gray: `#F5F5F5`

## Status

This workspace now includes production-oriented starter implementation for:
- Home screen
- Listing detail screen
- Booking confirmation screen
- Shared API layer templates
- iOS live listing fetch + booking submit scaffolding
- Android live listing fetch + booking submit scaffolding

See `docs/LAUNCHING_STEP.md` for launch flow.
See `docs/BACKEND_CONFIG.md` for live backend keys setup.
