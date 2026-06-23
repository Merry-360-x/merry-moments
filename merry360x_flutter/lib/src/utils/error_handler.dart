import 'dart:developer' as developer;

/// Centralized error handler that maps technical backend errors
/// to user-friendly messages. Never exposes raw API responses,
/// status codes, or JSON to the user.
class ErrorHandler {
  /// Formats any error into a user-friendly message.
  /// Logs the full technical error to console for debugging.
  static String formatError(dynamic error, {String? context}) {
    // Log the full technical error for developers
    developer.log(
      '[Error]${context != null ? ' [$context]' : ''}',
      error: error,
      stackTrace: StackTrace.current,
    );

    final errorStr = error.toString().toLowerCase();

    // Network/timeout errors
    if (errorStr.contains('timeout') ||
        errorStr.contains('timed out') ||
        errorStr.contains('connection') ||
        errorStr.contains('network') ||
        errorStr.contains('socket') ||
        errorStr.contains('handshake')) {
      return 'Something went wrong. Please check your connection and try again.';
    }

    // Invalid phone number
    if (errorStr.contains('invalid phone') ||
        errorStr.contains('phone number') ||
        (errorStr.contains('400') && errorStr.contains('phone'))) {
      return 'Please enter a valid Rwanda mobile number (e.g., 078XXXXXXX or 079XXXXXXX)';
    }

    // Payment initiation failed
    if (errorStr.contains('payment initiation') ||
        errorStr.contains('payment failed') ||
        errorStr.contains('pawa pay') ||
        errorStr.contains('pawapay')) {
      return "We couldn't start your payment. Please check your number and try again.";
    }

    // Insufficient funds / balance
    if (errorStr.contains('insufficient') ||
        errorStr.contains('balance') ||
        errorStr.contains('funds')) {
      return 'Payment could not be completed. Please check your balance and try again.';
    }

    // pg_net / function does not exist (Supabase extension missing)
    if (errorStr.contains('42883') ||
        errorStr.contains('does not exist') ||
        errorStr.contains('net_http_post') ||
        errorStr.contains('pg_net') ||
        errorStr.contains('function extensions')) {
      return 'Publishing is temporarily unavailable. Please try again in a few minutes.';
    }

    // Authentication/authorization errors
    if (errorStr.contains('unauthorized') ||
        errorStr.contains('401') ||
        errorStr.contains('403') ||
        errorStr.contains('permission') ||
        errorStr.contains('auth')) {
      return 'Your session has expired. Please sign in again.';
    }

    // Validation errors
    if (errorStr.contains('validation') ||
        errorStr.contains('invalid') ||
        errorStr.contains('bad request') ||
        errorStr.contains('400')) {
      return 'Please check your input and try again.';
    }

    // Server errors
    if (errorStr.contains('500') ||
        errorStr.contains('502') ||
        errorStr.contains('503') ||
        errorStr.contains('504') ||
        errorStr.contains('server error') ||
        errorStr.contains('internal error')) {
      return 'We ran into an issue. Please try again in a moment.';
    }

    // Not found
    if (errorStr.contains('404') || errorStr.contains('not found')) {
      return 'The requested resource was not found.';
    }

    // Default fallback
    return 'We ran into an issue. Please try again in a moment.';
  }

  /// Formats a payment-specific error with context about the operation.
  static String formatPaymentError(dynamic error) {
    return formatError(error, context: 'Payment');
  }

  /// Formats a listing publish error with context.
  static String formatPublishError(dynamic error) {
    return formatError(error, context: 'Publish');
  }

  /// Formats a generic API error with context.
  static String formatApiError(dynamic error, {String? operation}) {
    return formatError(error, context: operation ?? 'API');
  }
}