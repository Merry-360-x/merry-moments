export function uiErrorMessage(_err: unknown, fallback = "Something went wrong. Please try again.") {
  // Intentionally do NOT surface database/implementation details to end users.
  return fallback;
}

export function logError(context: string, err: unknown) {
  // Keep debugging capability without exposing details in the UI.
  // eslint-disable-next-line no-console
  console.error(`[${context}]`, err);
}

