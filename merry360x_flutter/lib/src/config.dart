class AppConfig {
  const AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://merry360x.com/api',
  );

  static String get supabaseUrl {
    const env = String.fromEnvironment('SUPABASE_URL');
    return env.isNotEmpty ? env : 'https://uwgiostcetoxotfnulfm.supabase.co';
  }

  static String get supabaseAnonKey {
    const env = String.fromEnvironment('SUPABASE_ANON_KEY');
    return env.isNotEmpty ? env : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA';
  }

  static Uri mobileSyncUri({String? userId}) {
    final query = <String, String>{
      'include': 'home,profile,wishlists,tripCart,bookings,notifications',
    };
    if (userId != null && userId.trim().isNotEmpty) {
      query['userId'] = userId.trim();
    }
    return Uri.parse('$apiBaseUrl/mobile-sync').replace(queryParameters: query);
  }

  static Uri mobileActionUri() {
    return Uri.parse('$apiBaseUrl/mobile-action');
  }
}
