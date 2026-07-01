import 'dart:async';
import 'package:app_links/app_links.dart';

class DeepLinkService {
  DeepLinkService._();
  static final DeepLinkService instance = DeepLinkService._();

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _subscription;

  Uri? _initialLink;
  Uri? get initialLink => _initialLink;

  final StreamController<Uri> _controller = StreamController<Uri>.broadcast();
  Stream<Uri> get onLink => _controller.stream;

  Future<void> initialize() async {
    _initialLink = await _appLinks.getInitialLink();

    _subscription = _appLinks.uriLinkStream.listen(_controller.add);
  }

  void dispose() {
    _subscription?.cancel();
    _controller.close();
  }
}
