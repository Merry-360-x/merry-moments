const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
const LINK_PATTERN = /(https?:\/\/|www\.)/i;
const PHONE_PATTERN = /(^|[^0-9])\+?[0-9][0-9\-\s()]{6,}[0-9]([^0-9]|$)/;
const BLOCKED_WORD_PATTERN = /\b(address|phone|telephone|whatsapp|telegram|snapchat|instagram|facebook|contact me|call me|text me|dm me)\b/i;

export const validateDirectMessageDraft = (rawMessage: string): string | null => {
  const message = String(rawMessage || "").trim();

  if (!message) {
    return "Message cannot be empty.";
  }
  if (message.length > 1200) {
    return "Message is too long. Keep it under 1200 characters.";
  }
  if (EMAIL_PATTERN.test(message)) {
    return "Sharing emails is not allowed in chat.";
  }
  if (LINK_PATTERN.test(message)) {
    return "Sharing links is not allowed in chat.";
  }
  if (PHONE_PATTERN.test(message)) {
    return "Sharing phone numbers is not allowed in chat.";
  }
  if (BLOCKED_WORD_PATTERN.test(message)) {
    return "For safety, contact details and off-platform coordination are blocked.";
  }

  return null;
};

export const toDirectMessageError = (error: unknown): string => {
  const message = String((error as { message?: string } | null)?.message || error || "").trim();

  if (!message) {
    return "Something went wrong while sending the message.";
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("direct_messages_safe_body") ||
    lower.includes("is_safe_direct_message") ||
    lower.includes("not allowed in chat")
  ) {
    return "For safety, contact details and off-platform coordination are blocked.";
  }
  if (lower.includes("direct_messages_not_self") || lower.includes("cannot message yourself")) {
    return "You cannot message yourself.";
  }

  return message.replace(/^exception:\s*/i, "");
};
