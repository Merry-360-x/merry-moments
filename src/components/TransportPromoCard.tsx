import { Link } from "react-router-dom";
import { Car } from "lucide-react";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { useTripCart } from "@/hooks/useTripCart";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";

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
  const { addToCart } = useTripCart();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const gallery = (props.media ?? []).filter(Boolean);
  const imgs = gallery.length ? gallery : props.imageUrl ? [props.imageUrl] : [];
  const from = String(props.currency ?? preferredCurrency ?? "RWF");
  const displayPrice = formatMoney(Number(props.pricePerDay ?? 0), from);
  return (
    <Link to="/transport" className="block" aria-label={props.title}>
      <div className="group rounded-lg md:rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden">
          {imgs.length ? (
            <ListingImageCarousel images={imgs} alt={props.title} className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40 flex items-center justify-center">
              <Car className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
            </div>
          )}
          {/* Desktop: Add to Trip button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="hidden md:flex absolute top-3 right-3 shadow-sm bg-background/90 hover:bg-background"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void addToCart("transport_vehicle", props.id, 1);
            }}
          >
            Add to Trip
          </Button>
          {/* Mobile: Small + button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="md:hidden absolute top-1.5 right-1.5 w-6 h-6 p-0 shadow-sm bg-background/90 hover:bg-background text-xs"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void addToCart("transport_vehicle", props.id, 1);
            }}
          >
            +
          </Button>
          {props.vehicleType ? (
            <span className="absolute bottom-1.5 md:bottom-3 left-1.5 md:left-3 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full bg-background/90 backdrop-blur-sm text-[8px] md:text-xs font-medium">
              {props.vehicleType}
            </span>
          ) : null}
        </div>

        <div className="p-2 md:p-4">
          <h3 className="font-semibold text-[10px] md:text-base text-foreground line-clamp-1">{props.title}</h3>
          <p className="text-[8px] md:text-sm text-muted-foreground mb-1 md:mb-3 line-clamp-1">
            {props.vehicleType ?? "Vehicle"}
            {props.seats ? ` · ${props.seats} seats` : ""}
          </p>
          <div className="flex items-baseline gap-0.5 md:gap-1">
            <span className="text-[10px] md:text-lg font-bold text-foreground">{displayPrice}</span>
            <span className="text-[8px] md:text-sm text-muted-foreground">/ day</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

