export function uiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again.") {
  // Extract user-friendly messages from common error types
  if (err && typeof err === "object") {
    const error = err as { message?: unknown; details?: unknown };
    
    // Supabase/PostgREST errors
    if (error.message) {
      const msg = String(error.message);
      
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

