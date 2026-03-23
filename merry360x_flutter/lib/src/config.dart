class AppConfig {
  const AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://merry360x.com/api',
  );

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
