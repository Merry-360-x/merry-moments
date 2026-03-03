# Backend Live Config

Use your production/staging Supabase project values.

## iOS (SwiftUI)

Edit:
- `ios-app/Merry360xMobile/Services/MobileConfig.swift`

Set:
- `supabaseUrl`
- `supabaseAnonKey`

## Android (Kotlin)

Edit:
- `android-app/app/build.gradle.kts`

Inside `defaultConfig`, update:
- `buildConfigField("String", "SUPABASE_URL", "\"https://YOUR.supabase.co\"")`
- `buildConfigField("String", "SUPABASE_ANON_KEY", "\"YOUR_ANON_KEY\"")`

Then sync Gradle and rebuild.

## Security

- Never place service-role keys in mobile apps.
- Use anon/public key only.
- Keep sensitive writes behind secured backend functions/RLS.
