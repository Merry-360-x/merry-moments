import { Link } from "react-router-dom";
import { MapPin, Star, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { extractNeighborhood } from "@/lib/location";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { useTripCart } from "@/hooks/useTripCart";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";

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
  source?: 'tours' | 'tour_packages';
  hostId?: string | null;
};

export default function TourPromoCard(props: TourPromoCardProps) {
  const { addToCart } = useTripCart();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const gallery = (props.images ?? []).filter(Boolean);
  const from = String(props.currency ?? "RWF");
  const baseAmount = Number(props.price ?? 0);
  const converted = convertAmount(baseAmount, from, preferredCurrency, usdRates);
  const displayPrice = formatMoney(converted ?? baseAmount, converted !== null ? preferredCurrency : from);
  // Determine item type - use source if provided, default to 'tour'
  const itemType = props.source === 'tour_packages' ? 'tour_package' : 'tour';
  
  // Check if host is verified (only when hostId is provided)
  const { data: hostVerified } = useQuery({
    queryKey: ["host-verified", props.hostId],
    enabled: Boolean(props.hostId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!props.hostId) return false;
      
      const { data: app, error } = await supabase
        .from("host_applications")
        .select("profile_complete")
        .eq("user_id", props.hostId)
        .order("profile_complete", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) return false;
      return app?.profile_complete === true;
    },
  });

  return (
    <Link to={`/tours/${props.id}`} className="block" aria-label={props.title}>
      <div className="group rounded-lg md:rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden">
          {gallery.length ? (
            <ListingImageCarousel images={gallery} alt={props.title} className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
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
              void addToCart(itemType, props.id, 1);
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
              void addToCart(itemType, props.id, 1);
            }}
          >
            +
          </Button>
          {props.category ? (
            <span className="absolute bottom-1.5 md:bottom-3 left-1.5 md:left-3 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full bg-background/90 backdrop-blur-sm text-[8px] md:text-xs font-medium flex items-center gap-1">
              {props.category}
              {hostVerified && (
                <BadgeCheck className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              )}
            </span>
          ) : hostVerified ? (
            <span className="absolute bottom-1.5 md:bottom-3 left-1.5 md:left-3 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full bg-background/90 backdrop-blur-sm text-[8px] md:text-xs font-medium flex items-center gap-1">
              <BadgeCheck className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              Verified
            </span>
          ) : null}
        </div>

        <div className="p-2 md:p-4">
          <div className="flex items-start justify-between gap-1 md:gap-2 mb-1 md:mb-2">
            <h3 className="font-semibold text-[10px] md:text-base text-foreground line-clamp-1">{props.title}</h3>
            {props.rating ? (
              <>
                {/* Desktop rating */}
                <div className="hidden md:flex items-center gap-1 shrink-0">
                  <Star className="w-4 h-4 fill-primary text-primary" />
                  <span className="text-sm font-medium">{Number(props.rating).toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({props.reviewCount ?? 0})</span>
                </div>
                {/* Mobile rating */}
                <div className="flex md:hidden items-center gap-0.5 shrink-0">
                  <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                  <span className="text-[8px] font-medium">{Number(props.rating).toFixed(1)}</span>
                </div>
              </>
            ) : null}
          </div>
          <p className="text-[8px] md:text-sm text-muted-foreground mb-1 md:mb-3 flex items-center gap-0.5 md:gap-1 line-clamp-1">
            <MapPin className="w-2.5 h-2.5 md:w-4 md:h-4 shrink-0" />
            {extractNeighborhood(props.location ?? "")}
          </p>
          <div className="flex items-baseline gap-0.5 md:gap-1">
            <span className="text-[10px] md:text-lg font-bold text-foreground">{displayPrice}</span>
            <span className="text-[8px] md:text-sm text-muted-foreground">/ person</span>
            {props.durationDays ? (
              <span className="ml-auto text-[8px] md:text-xs text-muted-foreground">{props.durationDays}d</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

