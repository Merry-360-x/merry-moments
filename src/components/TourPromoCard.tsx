import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { extractNeighborhood } from "@/lib/location";
import { formatMoneyWithConversion } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { useTripCart } from "@/hooks/useTripCart";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";

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
};

export default function TourPromoCard(props: TourPromoCardProps) {
  const { addToCart } = useTripCart();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const gallery = (props.images ?? []).filter(Boolean);
  const from = String(props.currency ?? preferredCurrency ?? "RWF");
  const displayPrice = formatMoneyWithConversion(Number(props.price ?? 0), from, preferredCurrency, usdRates);
  return (
    <Link to="/tours" className="block" aria-label={props.title}>
      <div className="group rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden">
          {gallery.length ? (
            <ListingImageCarousel images={gallery} alt={props.title} className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute top-3 right-3 shadow-sm bg-background/90 hover:bg-background"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void addToCart("tour", props.id, 1);
            }}
          >
            Add to Trip
          </Button>
          {props.category ? (
            <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium">
              {props.category}
            </span>
          ) : null}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-foreground line-clamp-1">{props.title}</h3>
            {props.rating ? (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="text-sm font-medium">{Number(props.rating).toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({props.reviewCount ?? 0})</span>
              </div>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {extractNeighborhood(props.location ?? "")}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">{displayPrice}</span>
            <span className="text-sm text-muted-foreground">/ person</span>
            {props.durationDays ? (
              <span className="ml-auto text-xs text-muted-foreground">{props.durationDays} day(s)</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

