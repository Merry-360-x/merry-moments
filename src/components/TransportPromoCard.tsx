import { Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { Car } from "lucide-react";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { formatMoney } from "@/lib/money";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";

export type TransportPromoCardProps = {
  id: string;
  title: string;
  vehicleType: string | null;
  seats: number | null;
  pricePerDay: number;
  currency: string | null;
  media: string[] | null;
  imageUrl: string | null;
};

export default function TransportPromoCard(props: TransportPromoCardProps) {
  const routerLocation = useLocation();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const gallery = (props.media ?? []).filter(Boolean);
  const imgs = gallery.length ? gallery : props.imageUrl ? [props.imageUrl] : [];
  const from = String(props.currency ?? "RWF");
  const baseAmount = Number(props.pricePerDay ?? 0);
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

  const subtitle = props.vehicleType ?? "Vehicle";

  const content = (
    <div className="group rounded-xl overflow-hidden bg-card">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        {imgs.length ? (
          <ListingImageCarousel images={imgs} alt={props.title} className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40 flex items-center justify-center">
            <Car className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-2 px-3">
        {/* Subtitle (vehicle type) */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm text-foreground truncate">
            {subtitle}
            {props.seats ? ` · ${props.seats} seats` : ""}
          </span>
        </div>

        {/* Title */}
        <p className="text-[13px] font-normal text-[#6A6A6A] truncate mt-[1px]">{props.title}</p>

        {/* Price */}
        <div className="flex items-baseline gap-1 mt-1 whitespace-nowrap">
          <span className="text-sm font-semibold text-foreground">{displayPrice}</span>
          <span className="text-[13px] text-[#6A6A6A]">/ day</span>
        </div>
      </div>
    </div>
  );

  return (
    <Link to={`/transport/${props.id}${forwardedQuery ? `?${forwardedQuery}` : ""}`} className="block" aria-label={props.title}>
      {content}
    </Link>
  );
}
