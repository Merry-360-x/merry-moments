import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'src/app.dart';
import 'src/config.dart';
import 'src/services/push_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final url = AppConfig.supabaseUrl;
  final key = AppConfig.supabaseAnonKey;
  debugPrint('[main] Supabase URL: $url');
  debugPrint('[main] Supabase key length: ${key.length}');

  await Supabase.initialize(
    url: url,
    anonKey: key,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );
  debugPrint('[main] Supabase initialized OK');

  await PushNotificationService.instance.initialize();

  runApp(const Merry360xMobileApp());
}
