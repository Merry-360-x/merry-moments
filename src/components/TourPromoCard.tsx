import { Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { Star } from "lucide-react";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { extractNeighborhood } from "@/lib/location";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";
import { formatMoney } from "@/lib/money";
import { TourPricingModel, getTourPriceSuffix } from "@/lib/tour-pricing";

export type TourPromoCardProps = {
  id: string;
  title: string;
  location: string | null;
  price: number;
  currency: string | null;
  images: string[] | null;
  rating?: number | null;
  reviewCount?: number | null;
  category?: string | null;
  durationDays?: number | null;
  pricingDurationValue?: number | null;
  pricingDurationUnit?: "minute" | "hour" | null;
  source?: 'tours' | 'tour_packages';
  hostId?: string | null;
  pricingModel?: TourPricingModel;
};

export default function TourPromoCard(props: TourPromoCardProps) {
  const routerLocation = useLocation();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const gallery = (props.images ?? []).filter(Boolean);
  const from = String(props.currency ?? "RWF");
  const baseAmount = Number(props.price ?? 0);
  const converted = convertAmount(baseAmount, from, preferredCurrency, usdRates);
  const displayPrice = formatMoney(converted ?? baseAmount, converted !== null ? preferredCurrency : from);

  const forwardedQuery = useMemo(() => {
    const params = new URLSearchParams(routerLocation.search);
    const keepKeys = ["q", "location", "start", "end", "adults", "children", "infants", "pets", "stay", "monthly", "duration", "guests"];
    const next = new URLSearchParams();
    for (const key of keepKeys) {
      const value = params.get(key);
      if (value) next.set(key, value);
    }
    return next.toString();
  }, [routerLocation.search]);

  const showRating = (props.rating ?? 0) > 0;
  const ratingVal = props.rating ?? 0;
  const ratingFormatted = ratingVal % 1 === 0 ? ratingVal.toFixed(0) : ratingVal.toFixed(1);
  const subtitle = extractNeighborhood(props.location ?? "") || (props.source === 'tour_packages' ? "Package" : "Tour");

  let durationText = "";
  if (props.pricingDurationValue && props.pricingDurationUnit) {
    durationText = `${props.pricingDurationValue} ${props.pricingDurationUnit}${props.pricingDurationValue > 1 ? 's' : ''}`;
  } else if (props.durationDays) {
    durationText = `${props.durationDays} day${props.durationDays > 1 ? 's' : ''}`;
  }

  const content = (
    <div className="group rounded-xl overflow-hidden bg-card">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        {gallery.length ? (
          <ListingImageCarousel images={gallery} alt={props.title} className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
        )}
      </div>

      {/* Content */}
      <div className="pt-2 px-3">
        {/* Subtitle (location) + rating */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm text-foreground truncate">
            {subtitle}
            {durationText ? ` · ${durationText}` : ""}
          </span>
          {showRating && (
            <div className="flex items-center gap-[2px] shrink-0">
              <Star className="w-3 h-3 fill-foreground text-foreground" />
              <span className="text-xs font-medium text-foreground">{ratingFormatted}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <p className="text-[13px] font-normal text-[#6A6A6A] truncate mt-[1px]">{props.title}</p>

        {/* Price */}
        <div className="flex items-baseline gap-1 mt-1 whitespace-nowrap">
          <span className="text-sm font-semibold text-foreground">{displayPrice}</span>
          <span className="text-[13px] text-[#6A6A6A]">{getTourPriceSuffix(props.pricingModel ?? "per_person")}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Link to={`/tours/${props.id}${forwardedQuery ? `?${forwardedQuery}` : ""}`} className="block" aria-label={props.title}>
      {content}
    </Link>
  );
}
