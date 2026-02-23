export type TourPricingModel = "per_person" | "per_group" | "per_hour" | "per_minute";

const VALID_MODELS: TourPricingModel[] = ["per_person", "per_group", "per_hour", "per_minute"];

const normalizeTourPricingModel = (value: unknown): TourPricingModel | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return (VALID_MODELS as string[]).includes(normalized)
    ? (normalized as TourPricingModel)
    : null;
};

export function getTourPricingModels(pricingTiers: unknown): TourPricingModel[] {
  if (!pricingTiers || Array.isArray(pricingTiers) || typeof pricingTiers !== "object") {
    return ["per_person"];
  }

  const rawArray = (pricingTiers as { pricing_models?: unknown }).pricing_models;
  if (Array.isArray(rawArray)) {
    const asSet = new Set(
      rawArray
        .map((item) => normalizeTourPricingModel(item))
        .filter((item): item is TourPricingModel => Boolean(item))
    );

    const ordered = VALID_MODELS.filter((model) => asSet.has(model));
    if (ordered.length > 0) return ordered;
  }

  const single = normalizeTourPricingModel((pricingTiers as { pricing_model?: unknown }).pricing_model);
  return [single || "per_person"];
}

export function getTourPricingModel(pricingTiers: unknown): TourPricingModel {
  return getTourPricingModels(pricingTiers)[0] || "per_person";
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
