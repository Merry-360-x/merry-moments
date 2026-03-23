class MobileSyncPayload {
  const MobileSyncPayload({
    required this.serverTime,
    required this.homeListings,
    required this.stories,
    required this.profile,
    required this.roles,
    required this.bookings,
    required this.wishlists,
    required this.tripCart,
    required this.notifications,
  });

  final String serverTime;
  final List<Map<String, dynamic>> homeListings;
  final List<Map<String, dynamic>> stories;
  final Map<String, dynamic>? profile;
  final List<String> roles;
  final List<Map<String, dynamic>> bookings;
  final List<Map<String, dynamic>> wishlists;
  final List<Map<String, dynamic>> tripCart;
  final List<Map<String, dynamic>> notifications;

  factory MobileSyncPayload.fromJson(Map<String, dynamic> json) {
    List<Map<String, dynamic>> readList(dynamic value) {
      if (value is! List) return const [];
      return value.whereType<Map<String, dynamic>>().toList();
    }

    final home = (json['home'] as Map?)?.cast<String, dynamic>() ?? const {};

    return MobileSyncPayload(
      serverTime: (json['serverTime'] ?? '').toString(),
      homeListings: readList(home['listings']),
      stories: readList(home['stories']),
      profile: (json['profile'] as Map?)?.cast<String, dynamic>(),
      roles: (json['roles'] is List)
          ? (json['roles'] as List)
              .map((value) => value.toString())
              .where((value) => value.trim().isNotEmpty)
              .toList()
          : const [],
      bookings: readList(json['bookings']),
      wishlists: readList(json['wishlists']),
      tripCart: readList(json['tripCart']),
      notifications: readList(json['notifications']),
    );
  }
}
