import '../config.dart';

/// Cloudinary cloud names that are disabled and should never be used for display.
/// MUST match packages/shared-config/cloudinary.ts
const _disabledCloudNames = ['dxdblhmbm'];

/// Check if a Cloudinary URL is from a disabled cloud account
bool _isWorkingCloudinaryUrl(String url) {
  try {
    final uri = Uri.parse(url);
    if (uri.host == 'res.cloudinary.com') {
      final segments = uri.pathSegments;
      if (segments.isNotEmpty && _disabledCloudNames.contains(segments[0])) {
        return false;
      }
    }
    return true;
  } catch (_) {
    return false;
  }
}

String? normalizeMediaUrl(String? raw) {
  final value = raw?.trim() ?? '';
  if (value.isEmpty) return null;

  if (value.startsWith('http://') || value.startsWith('https://')) {
    final baseHost = Uri.tryParse(AppConfig.apiBaseUrl)?.host;
    final uri = Uri.tryParse(value);
    // Reject URLs from disabled cloud accounts
    if (!_isWorkingCloudinaryUrl(value)) return null;
    if (uri != null && uri.host.isNotEmpty && baseHost == uri.host && value.startsWith('http://')) {
      return value.replaceFirst('http://', 'https://');
    }
    return value;
  }
  if (value.startsWith('//')) {
    final resolved = 'https:$value';
    return _isWorkingCloudinaryUrl(resolved) ? resolved : null;
  }
  if (value.startsWith('res.cloudinary.com/')) {
    final resolved = 'https://$value';
    return _isWorkingCloudinaryUrl(resolved) ? resolved : null;
  }
  if (value.startsWith('merry360x.com/') || value.startsWith('www.merry360x.com/')) {
    return 'https://$value';
  }

  final base = AppConfig.apiBaseUrl;
  const relativePrefixes = ['uploads/', 'media/', 'images/', 'storage/'];
  if (value.startsWith('/') || relativePrefixes.any((p) => value.startsWith(p))) {
    final path = value.startsWith('/') ? value : '/$value';
    if (base.endsWith('/')) return '${base.substring(0, base.length - 1)}$path';
    return '$base$path';
  }

  return value;
}

String? normalizeImageUrl(String? raw) {
  final normalized = normalizeMediaUrl(raw);
  if (normalized == null) return null;

  // Apply Cloudinary transformations to limit image dimensions
  const cloudPrefix = 'res.cloudinary.com/dghg9uebh/image/upload/';
  final idx = normalized.indexOf(cloudPrefix);
  if (idx != -1) {
    final rest = normalized.substring(idx + cloudPrefix.length);
    // If first segment after upload/ starts with a version like "v1234", no
    // transformation is present yet. Inject responsive defaults.
    if (RegExp(r'^v\d+/').hasMatch(rest)) {
      return '${normalized.substring(0, idx + cloudPrefix.length)}f_auto,q_auto:eco,dpr_auto,c_limit,w_1200/$rest';
    }
    // Transformation already present — return as-is.
    return normalized;
  }

  // Already an HTTP URL (non-Cloudinary) — return as-is.
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  // Relative path — wrap with Cloudinary defaults.
  return 'https://res.cloudinary.com/dghg9uebh/image/upload/f_auto,q_auto:eco,dpr_auto,c_limit,w_1200/$normalized';
}
