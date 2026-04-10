# Mobile Push Setup (Support Chat)

This project now supports OS-level mobile push for support chat replies.

## 1) Flutter app dependencies

Already added in pubspec:

- firebase_core
- firebase_messaging

Run:

- flutter pub get

## 2) Firebase app files

Add platform config files:

- Android: android/app/google-services.json
- iOS: ios/Runner/GoogleService-Info.plist

## 3) Android setup

Already wired in this repo:

- Google services Gradle plugin in settings and app module
- POST_NOTIFICATIONS permission in AndroidManifest

## 4) iOS setup

Already wired in this repo:

- remote-notification background mode in Info.plist

Still required in Xcode project:

- Enable Push Notifications capability
- Enable Background Modes -> Remote notifications
- Configure APNs key/certificate in Firebase project

## 5) Supabase DB migration

Apply migration that creates public.mobile_push_tokens:

- supabase/migrations/20260409113000_add_mobile_push_tokens.sql

## 6) Supabase edge function

Deploy functions:

- supabase functions deploy send-support-push
- supabase functions deploy send-general-push

Set function secrets:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- FCM_PROJECT_ID
- FCM_SERVICE_ACCOUNT_EMAIL
- FCM_SERVICE_ACCOUNT_PRIVATE_KEY

Optional fallback only:

- FCM_SERVER_KEY

FCM legacy HTTP API is deprecated and may be disabled in Firebase projects. Prefer HTTP v1 secrets above.

## 7) End-to-end flow

- App logs in and registers device token in public.mobile_push_tokens.
- When a support message is sent, clients invoke send-support-push with messageId.
- Function verifies sender identity, resolves recipient users, and sends push through FCM.
- Invalid tokens are auto-marked inactive.

## 8) Admin special notification generator

- Admin dashboard support tab now includes a special notification generator.
- It invokes send-general-push with target audience options (all/customers/hosts/staff/custom IDs).
- Delivery can be push, in-app, or both.
