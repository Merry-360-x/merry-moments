import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';

/// Cloudinary unsigned upload service.
///
/// Cloud name  : dghg9uebh
/// Upload preset: MERRY360X (unsigned)
class CloudinaryService {
  static const _cloudName = 'dghg9uebh';
  static const _uploadPreset = 'MERRY360X';

  /// Individual upload progress tracking
  static const int maxConcurrentUploads = 5;

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

  /// Upload multiple image files in parallel (up to 5 at a time).
  /// Skips any failed uploads and returns all successfully uploaded URLs.
  /// 
  /// [onProgress] - Called with (completed, total) after each upload completes
  /// [onItemProgress] - Called with (index, percent) for individual upload progress
  static Future<List<String>> uploadImages(
    List<String> filePaths, {
    required String folder,
    void Function(int done, int total)? onProgress,
    void Function(int index, double percent)? onItemProgress,
  }) async {
    if (filePaths.isEmpty) return [];

    final results = <String>[];
    final uploadsInProgress = <Future<void>>[];
    int completedCount = 0;
    
    // Process uploads in batches of maxConcurrentUploads
    for (int i = 0; i < filePaths.length; i++) {
      final index = i;
      final filePath = filePaths[i];
      
      // Start upload
      final uploadFuture = _uploadWithProgress(
        filePath,
        folder: folder,
        onProgress: (percent) {
          onItemProgress?.call(index, percent);
        },
      ).then((url) {
        if (url != null) {
          results.add(url);
        }
        completedCount++;
        onProgress?.call(completedCount, filePaths.length);
      }).catchError((_) {
        // Skip failed uploads silently
        completedCount++;
        onProgress?.call(completedCount, filePaths.length);
      });
      
      uploadsInProgress.add(uploadFuture);
      
      // Wait when we reach the concurrent limit
      if (uploadsInProgress.length >= maxConcurrentUploads) {
        await Future.wait(uploadsInProgress);
        uploadsInProgress.clear();
      }
    }
    
    // Wait for remaining uploads
    if (uploadsInProgress.isNotEmpty) {
      await Future.wait(uploadsInProgress);
    }
    
    return results;
  }

  /// Internal helper for uploading with progress tracking
  static Future<String?> _uploadWithProgress(
    String filePath, {
    required String folder,
    void Function(double percent)? onProgress,
  }) async {
    try {
      onProgress?.call(0.0);
      
      final uri = Uri.parse(
        'https://api.cloudinary.com/v1_1/$_cloudName/image/upload',
      );

      final file = File(filePath);
      final bytes = await file.readAsBytes();
      final fileName = filePath.split('/').last;

      onProgress?.call(25.0); // File read complete

      final request = http.MultipartRequest('POST', uri)
        ..fields['upload_preset'] = _uploadPreset
        ..fields['folder'] = folder
        ..files.add(http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: fileName,
        ));

      onProgress?.call(50.0); // Request prepared

      final streamedResponse = await request.send();
      
      onProgress?.call(75.0); // Upload complete, awaiting response

      final body = await streamedResponse.stream.bytesToString();

      if (streamedResponse.statusCode < 200 || streamedResponse.statusCode >= 300) {
        throw Exception('Cloudinary upload failed (${streamedResponse.statusCode}): $body');
      }

      final json = jsonDecode(body) as Map<String, dynamic>;
      final url = json['secure_url'] as String?;
      
      if (url == null || url.isEmpty) {
        throw Exception('Cloudinary returned no secure_url: $body');
      }
      
      onProgress?.call(100.0); // Complete
      return url;
    } catch (e) {
      onProgress?.call(0.0); // Reset on error
      return null;
    }
  }
}
