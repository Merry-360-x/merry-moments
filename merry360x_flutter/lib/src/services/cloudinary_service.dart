import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Cloudinary unsigned upload service.
///
/// Cloud name  : dghg9uebh
/// Upload preset: MERRY360X (unsigned)
class CloudinaryService {
  static const _cloudName = 'dghg9uebh';
  static const _uploadPreset = 'MERRY360X';

  /// Upload a single image file to Cloudinary.
  /// [folder] — Cloudinary folder (e.g. 'properties', 'tours', 'transport').
  /// Returns the secure HTTPS URL of the uploaded image.
  static Future<String> uploadImage(
    String filePath, {
    required String folder,
    void Function(double progress)? onProgress,
  }) async {
    final uri = Uri.parse(
      'https://api.cloudinary.com/v1_1/$_cloudName/image/upload',
    );

    final file = File(filePath);
    final bytes = await file.readAsBytes();
    final fileName = filePath.split('/').last;

    final request = http.MultipartRequest('POST', uri)
      ..fields['upload_preset'] = _uploadPreset
      ..fields['folder'] = folder
      ..files.add(http.MultipartFile.fromBytes(
        'file',
        bytes,
        filename: fileName,
      ));

    final streamedResponse = await request.send();
    final body = await streamedResponse.stream.bytesToString();

    if (streamedResponse.statusCode < 200 || streamedResponse.statusCode >= 300) {
      throw Exception('Cloudinary upload failed (${streamedResponse.statusCode}): $body');
    }

    final json = jsonDecode(body) as Map<String, dynamic>;
    final url = json['secure_url'] as String?;
    if (url == null || url.isEmpty) {
      throw Exception('Cloudinary returned no secure_url: $body');
    }
    return url;
  }

  /// Upload multiple image files. Skips any failed uploads and returns
  /// all successfully uploaded URLs.
  static Future<List<String>> uploadImages(
    List<String> filePaths, {
    required String folder,
    void Function(int done, int total)? onProgress,
  }) async {
    final results = <String>[];
    for (int i = 0; i < filePaths.length; i++) {
      try {
        final url = await uploadImage(filePaths[i], folder: folder);
        results.add(url);
      } catch (_) {
        // Skip failed uploads — don't block the whole form save
      }
      onProgress?.call(i + 1, filePaths.length);
    }
    return results;
  }
}
