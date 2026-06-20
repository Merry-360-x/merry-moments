# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Supabase
-keep class com.supabase.** { *; }
-keep class io.github.jan.supabase.** { *; }
-keep class postgrest.** { *; }
-keep class gotrue.** { *; }
-keep class realtime.** { *; }
-keep class storage.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }

# OkHttp
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**

# Gson
-keep class com.google.gson.** { *; }

# AndroidX
-keep class androidx.** { *; }

# Ignore missing Play Core classes (Flutter deferred components, not used)
-dontwarn com.google.android.play.core.**

# Ignore missing Play Core classes (Flutter deferred components, not used)
-dontwarn com.google.android.play.core.**

# Ignore missing Play Core classes (Flutter deferred components, not used)
-dontwarn com.google.android.play.core.**