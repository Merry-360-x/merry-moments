export type TourPricingModel = "per_person" | "per_group" | "per_hour" | "per_minute";

const VALID_MODELS: TourPricingModel[] = ["per_person", "per_group", "per_hour", "per_minute"];

export function getTourPricingModel(pricingTiers: unknown): TourPricingModel {
  if (!pricingTiers || Array.isArray(pricingTiers) || typeof pricingTiers !== "object") {
    return "per_person";
  }

  const raw = (pricingTiers as { pricing_model?: unknown }).pricing_model;
  if (typeof raw !== "string") return "per_person";

  const normalized = raw.trim().toLowerCase();
  return (VALID_MODELS as string[]).includes(normalized)
    ? (normalized as TourPricingModel)
    : "per_person";
}

export function getTourPriceSuffix(model: TourPricingModel): string {
  if (model === "per_group") return "per group";
  if (model === "per_hour") return "per hour";
  if (model === "per_minute") return "per minute";
  return "per person";
}

export function getTourBillingQuantity(model: TourPricingModel, participants: number): number {
  if (model === "per_person") return Math.max(1, participants);
  return 1;
}
