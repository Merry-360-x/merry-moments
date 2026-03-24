import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'src/app.dart';
import 'src/config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final url = AppConfig.supabaseUrl;
  final key = AppConfig.supabaseAnonKey;
  debugPrint('[main] Supabase URL: $url');
  debugPrint('[main] Supabase key length: ${key.length}');

  await Supabase.initialize(url: url, anonKey: key);
  debugPrint('[main] Supabase initialized OK');

  runApp(const Merry360xMobileApp());
}
