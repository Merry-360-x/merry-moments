# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.kts.

# Keep Supabase classes and methods
-keep class com.supabase.** { *; }
-keep class io.github.jan.supabase.** { *; }

# Keep Coil image loading classes
-keep class coil.** { *; }
-keep class coil.network.** { *; }
-keep class coil.decode.** { *; }

# Keep Glide and other image libraries if used
-keep public class * implements android.graphics.BitmapFactoryDecoder { public; protected; <init>(); }
-keep public class * extends android.graphics.BitmapFactoryDecoder { public; protected; <init>(android.content.Context); }

# Keep OkHttp for network requests
-keep class okhttp3.** { *; }
-dont warn okhttp3.**

# Keep Retrofit if used
-keep class retrofit.** { *; }

# Keep Gson/FastJson for JSON parsing
-keep class com.google.gson.** { *; }
-keep class org.json.** { *; }

# Keep Parcelize annotations
-keepattributes *Annotation*
-keepclassmembers,allowobfuscation interface * {
    @com.android.build.parcelize.Parcelize <fields>;
}

# Keep MethodChannel for Flutter native method calls
-keep class io.flutter.embedding.engine.dart.** { *; }
-keep class io.flutter.plugin.common.MethodChannel$** { *; }

# Keep SharedPreferences
-keep class * implements android.content.SharedPreferences { public; protected; <init>(); }

# Keep Firebase classes
-keep class com.google.firebase.** { *; }

# Keep Room database classes if used
-keep class androidx.room.** { *; }

# Keep Hilt/Dagger if used
-keep class * extends dagger.hilt.android.internal.managers.HiltAppComponent { *; }
-keep class * extends dagger.hilt.android.internal.managers.HiltActivityComponent { *; }
-keep class * extends dagger.hilt.android.internal.managers.HiltFragmentComponent { *; }

# Keep Retrofit converters
-keep class * implements retrofit.ConverterFactory { *; }

# Keep OkHttp interceptors
-keepclassmembers class okhttp3.Interceptor {
    public <init> (...);
}

# Keep Coil image transformations
-keep class coil.image.** { *; }

# Keep Flutter embedding classes
-keep class io.flutter.embedding.android.** { *; }
-keep class io.flutter.embedding.engine.** { *; }

# Keep WebView classes if used
-keep class android.webkit.** { *; }

# Keep AndroidX lifecycle classes
-keep class androidx.lifecycle.** { *; }

# Keep Coroutines and RxJava
-keep class kotlinx.coroutines.** { *; }
-keep class io.reactivex.** { *; }
-keep class io.reactivex.rxjava3.** { *; }

# Keep Kotlin extensions
-keepclassmembers class * {
    @kotlin.Metadata <fields>;
}

# Keep AndroidX navigation
-keep class androidx.navigation.** { *; }

# Keep DataStore if used
-keep class androidx.datastore.** { *; }

# Keep WorkManager if used
-keep class androidx.work.** { *; }

# Keep Room database migrations
-keep class androidx.room.migration.** { *; }

# Keep Hilt generated classes
-dontwarn dagger.hilt.android.internal.managers.HiltAppComponent
-dontwarn dagger.hilt.android.internal.managers.HiltActivityComponent
-dontwarn dagger.hilt.android.internal.managers.HiltFragmentComponent

# Keep OkHttp cache
-keep class * implements okhttp3.Cache { *; }

# Keep Coil disk cache
-keep class coil.disk.** { *; }

# Keep AndroidX core ktx
-keep class androidx.core.ktx.** { *; }

# Keep Jetpack Compose if used (even though Flutter uses its own)
-keep class androidx.compose.** { *; }

# Keep DataBinding if used
-keep class android.databinding.** { *; }

# Keep AndroidX Fragment
-keep class androidx.fragment.** { *; }

# Keep AndroidX Activity
-keep class androidx.activity.** { *; }

# Keep AndroidX View
-keep class androidx.viewpager2.** { *; }

# Keep AndroidX RecyclerView
-keep class androidx.recyclerview.** { *; }

# Keep AndroidX SwipeRefreshLayout
-keep class androidx.swiperefreshlayout.** { *; }

# Keep AndroidX CardView
-keep class androidx.cardview.** { *; }

# Keep AndroidX ConstraintLayout
-keep class androidx.constraintlayout.** { *; }

# Keep AndroidX CoordinatorLayout
-keep class androidx.coordinatorlayout.** { *; }

# Keep AndroidX DrawerLayout
-keep class androidx.drawerlayout.** { *; }

# Keep AndroidX NavigationView
-keep class androidx.navigation.** { *; }

# Keep AndroidX SwipeRefreshLayout
-keep class androidx.swiperefreshlayout.** { *; }

# Keep AndroidX RecyclerView
-keep class androidx.recyclerview.** { *; }

# Keep AndroidX CardView
-keep class androidx.cardview.** { *; }

# Keep AndroidX ConstraintLayout
-keep class androidx.constraintlayout.** { *; }

# Keep AndroidX CoordinatorLayout
-keep class androidx.coordinatorlayout.** { *; }

# Keep AndroidX DrawerLayout
-keep class androidx.drawerlayout.** { *; }

# Keep AndroidX NavigationView
-keep class androidx.navigation.** { *; }

# Keep AndroidX SwipeRefreshLayout
-keep class androidx.swiperefreshlayout.** { *; }

# Keep AndroidX RecyclerView
-keep class androidx.recyclerview.** { *; }

# Keep AndroidX CardView
-keep class androidx.cardview.** { *; }

# Keep AndroidX ConstraintLayout
-keep class androidx.constraintlayout.** { *; }

# Keep AndroidX CoordinatorLayout
-keep class androidx.coordinatorlayout.** { *; }

# Keep AndroidX DrawerLayout
-keep class androidx.drawerlayout.** { *; }

# Keep AndroidX NavigationView
-keep class androidx.navigation.** { *; }