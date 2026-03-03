export const getPreferredDashboardPath = (roles: string[]): string | null => {
  const normalized = new Set((roles ?? []).map((role) => String(role).trim().toLowerCase()));

  if (normalized.has("admin")) return "/admin";
  if (normalized.has("financial_staff")) return "/financial-dashboard";
  if (normalized.has("operations_staff")) return "/operations-dashboard";
  if (normalized.has("customer_support")) return "/customer-support-dashboard";
  if (normalized.has("host")) return "/host-dashboard";

  return null;
};
