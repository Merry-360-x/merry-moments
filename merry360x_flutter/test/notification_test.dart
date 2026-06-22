import 'package:flutter_test/flutter_test.dart';
import 'package:merry360x_flutter/src/services/notification_service.dart';

void main() {
  group('AppNotification', () {
    test('fromMap parses all fields correctly', () {
      final map = {
        'id': 'notif-1',
        'type': 'booking_confirmed',
        'title': 'Booking Confirmed!',
        'body': 'Your booking at Lakeside Villa is confirmed!',
        'screen_route': '/my-bookings/abc123',
        'data': {'booking_id': 'abc123', 'amount': '50000'},
        'is_read': false,
        'created_at': '2026-06-21T10:00:00Z',
      };

      final notif = AppNotification.fromMap(map);

      expect(notif.id, 'notif-1');
      expect(notif.type, 'booking_confirmed');
      expect(notif.title, 'Booking Confirmed!');
      expect(notif.body, 'Your booking at Lakeside Villa is confirmed!');
      expect(notif.screenRoute, '/my-bookings/abc123');
      expect(notif.data['booking_id'], 'abc123');
      expect(notif.data['amount'], '50000');
      expect(notif.isRead, false);
      expect(notif.createdAt, DateTime.utc(2026, 6, 21, 10, 0, 0));
    });

    test('fromMap handles missing optional fields', () {
      final map = {
        'id': 'notif-2',
        'type': 'new_message',
        'title': 'New Message',
        'body': 'You have a new message',
        'is_read': true,
        'created_at': '2026-06-21T12:00:00Z',
      };

      final notif = AppNotification.fromMap(map);

      expect(notif.id, 'notif-2');
      expect(notif.screenRoute, isNull);
      expect(notif.data, isEmpty);
      expect(notif.isRead, true);
    });

    test('fromMap handles missing is_read field', () {
      final map = {
        'id': 'notif-3',
        'type': 'payment_success',
        'title': 'Payment Successful',
        'body': 'Payment received',
        'created_at': '2026-06-21T14:00:00Z',
      };

      final notif = AppNotification.fromMap(map);

      expect(notif.isRead, false);
    });

    test('fromMap handles null created_at', () {
      final map = {
        'id': 'notif-4',
        'type': 'test',
        'title': 'Test',
        'body': 'Test body',
        'created_at': null,
      };

      final notif = AppNotification.fromMap(map);

      expect(notif.createdAt, isA<DateTime>());
    });

    test('toMap and fromMap are symmetric', () {
      final original = AppNotification(
        id: 'notif-5',
        type: 'check_in_reminder',
        title: 'Check-in Tomorrow',
        body: 'You are checking in tomorrow',
        screenRoute: '/my-bookings/xyz',
        data: {'booking_id': 'xyz'},
        isRead: false,
        createdAt: DateTime.utc(2026, 6, 20, 8, 0, 0),
      );

      final map = original.toMap();
      final reconstructed = AppNotification.fromMap(map);

      expect(reconstructed.id, original.id);
      expect(reconstructed.type, original.type);
      expect(reconstructed.title, original.title);
      expect(reconstructed.body, original.body);
      expect(reconstructed.screenRoute, original.screenRoute);
      expect(reconstructed.data['booking_id'], 'xyz');
      expect(reconstructed.isRead, original.isRead);
      expect(reconstructed.createdAt, original.createdAt);
    });
  });
}
