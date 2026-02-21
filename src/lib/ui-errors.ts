export function uiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again.") {
  const isAbortLike = (message: string) => {
    const normalized = String(message || "").toLowerCase();
    return (
      normalized.includes("aborterror") ||
      normalized.includes("signal is abort") ||
      normalized.includes("aborted") ||
      normalized.includes("the operation was aborted")
    );
  };

  // Extract user-friendly messages from common error types
  if (err && typeof err === "object") {
    const error = err as { message?: unknown; details?: unknown };
    
    // Supabase/PostgREST errors
    if (error.message) {
      const msg = String(error.message);

      if (isAbortLike(msg)) {
        return fallback;
      }
      
      // Handle specific error patterns
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return "This feature is not yet available. Please contact support.";
      }
      if (msg.includes("JWT") || msg.includes("expired")) {
        return "Your session has expired. Please sign in again.";
      }
      if (msg.includes("permission denied") || msg.includes("policy")) {
        return "You don't have permission to perform this action.";
      }
      if (msg.includes("violates")) {
        return "Invalid data provided. Please check your input.";
      }
      
      // Return the message if it's user-friendly (no technical jargon)
      if (!msg.match(/\b(column|schema|table|sql|code|PGRST|42\d{3})\b/i)) {
        return msg;
      }
    }
    
    // Return error details if available
    if (error.details) {
      return String(error.details);
    }
  }
  
  return fallback;
}

export function logError(context: string, err: unknown) {
  if (err && typeof err === "object") {
    const error = err as { message?: unknown; name?: unknown };
    const message = String(error.message || "").toLowerCase();
    const name = String(error.name || "").toLowerCase();
    if (
      name === "aborterror" ||
      message.includes("aborterror") ||
      message.includes("signal is abort") ||
      message.includes("aborted")
    ) {
      return;
    }
  }

  // Log comprehensive error details for debugging
  console.error(`[${context}]`, err);
  
  // Log additional details if it's an error object
  if (err && typeof err === "object") {
    const error = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    if (error.message) {
      console.error(`[${context}] Message:`, error.message);
    }
    if (error.code) {
      console.error(`[${context}] Code:`, error.code);
    }
    if (error.details) {
      console.error(`[${context}] Details:`, error.details);
    }
    if (error.hint) {
      console.error(`[${context}] Hint:`, error.hint);
    }
  }
}

export function getFriendlyPaymentErrorMessage(message?: string, fallback = "Payment failed. Please try again.") {
  if (!message) return fallback;

  const lowered = message.toLowerCase();
  const isCheckoutRlsError =
    lowered.includes("row-level security policy") && lowered.includes("checkout_requests");

  if (isCheckoutRlsError) {
    return "Payment Failed, Register to complete your booking";
  }

  if (lowered.includes("amount_too_large") || lowered.includes("amount should not be greater than")) {
    const maxMatch = message.match(/greater than\s+([\d,\.]+)/i);
    const limit = maxMatch?.[1];
    return limit
      ? `Payment amount exceeds the provider limit (${limit}). Please reduce the amount and try again.`
      : "Payment amount exceeds the provider limit. Please reduce the amount and try again.";
  }

  if (lowered.includes("minimum payment amount is")) {
    return message;
  }

  return message;
}

