import { useEffect, useState } from "react";
import { Star, Heart, Users, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useFavorites } from "@/hooks/useFavorites";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";
import { extractNeighborhood } from "@/lib/location";
import { formatMoneyWithConversion } from "@/lib/money";

export interface PropertyCardProps {
  id?: string;
  image?: string | null;
  images?: string[] | null;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  pricePerPerson?: number | null;
  currency?: string;
  type: string;
  bedrooms?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  maxGuests?: number | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  smokingAllowed?: boolean | null;
  eventsAllowed?: boolean | null;
  petsAllowed?: boolean | null;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  hostId?: string | null;
}

const PropertyCard = ({
  id,
  image,
  title,
  location,
  rating,
  reviews,
  price,
  pricePerPerson,
  currency = "RWF",
  type,
  images,
  bedrooms,
  beds,
  bathrooms,
  maxGuests,
  checkInTime,
  checkOutTime,
  smokingAllowed,
  eventsAllowed,
  petsAllowed,
  isFavorited,
  onToggleFavorite,
  hostId,
}: PropertyCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const { toggleFavorite, checkFavorite } = useFavorites();
  const [fav, setFav] = useState(Boolean(isFavorited));

  // Check if host is verified (only when hostId is provided)
  const { data: hostVerified } = useQuery({
    queryKey: ["host-verified", hostId],
    enabled: Boolean(hostId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!hostId) return false;
      
      const { data: app, error } = await supabase
        .from("host_applications")
        .select("profile_complete")
        .eq("user_id", hostId)
        .order("profile_complete", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) return false;
      return app?.profile_complete === true;
    },
  });

  const gallery = images?.length ? images : image ? [image] : [];
  const originalCurrency = currency ?? "RWF"; // The currency the property price is stored in
  const hasRules =
    typeof smokingAllowed === "boolean" ||
    typeof eventsAllowed === "boolean" ||
    typeof petsAllowed === "boolean" ||
    Boolean(checkInTime) ||
    Boolean(checkOutTime) ||
    typeof maxGuests === "number";

  useEffect(() => {
    setFav(Boolean(isFavorited));
  }, [isFavorited]);

  useEffect(() => {
    if (!id) return;
    if (typeof isFavorited === "boolean") return;
    let alive = true;
    (async () => {
      const next = await checkFavorite(String(id));
      if (alive) setFav(next);
    })();
    return () => {
      alive = false;
    };
  }, [checkFavorite, id, isFavorited]);

  const content = (
    <div className="group rounded-lg md:rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300 animate-fade-in">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {gallery.length ? (
          <ListingImageCarousel
            images={gallery}
            alt={title}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!id) return;
            if (onToggleFavorite) {
              onToggleFavorite();
              return;
            }
            void (async () => {
              const ok = await toggleFavorite(String(id), fav);
              if (ok) setFav((v) => !v);
            })();
          }}
          className="absolute top-1.5 md:top-3 right-1.5 md:right-3 p-1 md:p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          aria-label={t("actions.favorites")}
        >
          <Heart
            className={`w-3 h-3 md:w-4 md:h-4 ${fav ? "fill-primary text-primary" : "text-foreground"}`}
          />
        </button>
        <span className="absolute bottom-1.5 md:bottom-3 left-1.5 md:left-3 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full bg-background/90 backdrop-blur-sm text-[8px] md:text-xs font-medium flex items-center gap-1">
          {type}
          {hostVerified && (
            <BadgeCheck className="w-3 h-3 md:w-4 md:h-4 text-primary" />
          )}
        </span>
      </div>

      {/* Content */}
      <div className="p-2 md:p-4">
        <div className="flex items-start justify-between gap-1 md:gap-2 mb-1 md:mb-2">
          <h3 className="font-semibold text-[10px] md:text-base text-foreground line-clamp-1">{title}</h3>
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="text-sm font-medium">{rating}</span>
            <span className="text-sm text-muted-foreground">({reviews})</span>
          </div>
          {/* Mobile: compact rating */}
          <div className="flex md:hidden items-center gap-0.5 shrink-0">
            <Star className="w-2.5 h-2.5 fill-primary text-primary" />
            <span className="text-[8px] font-medium">{rating}</span>
          </div>
        </div>
        <p className="text-[8px] md:text-sm text-muted-foreground mb-0.5 md:mb-1 line-clamp-1">{extractNeighborhood(location)}</p>
        {/* Mobile: Show beds compact */}
        {(beds || bedrooms) && (
          <p className="md:hidden text-[8px] text-muted-foreground mb-1">
            {beds ? `${beds} bed${beds > 1 ? 's' : ''}` : bedrooms ? `${bedrooms} bedroom${bedrooms > 1 ? 's' : ''}` : ''}
          </p>
        )}
        {/* Hide details on mobile for compact view */}
        <div className="hidden md:block">
          {(bedrooms || beds || bathrooms) ? (
            <p className="text-xs text-muted-foreground mb-3">
              {[bedrooms ? `${bedrooms} bd` : null, beds ? `${beds} beds` : null, bathrooms ? `${bathrooms} bath` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {hasRules ? (
            <div className="mb-3 px-1 text-xs">
              <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                <div className="min-w-0">
                  <div className="text-muted-foreground">Check-in</div>
                  <div className="font-semibold text-foreground tabular-nums">
                    {checkInTime ? String(checkInTime).slice(0, 5) : "—"}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground">Check-out</div>
                  <div className="font-semibold text-foreground tabular-nums">
                    {checkOutTime ? String(checkOutTime).slice(0, 5) : "—"}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Guests
                  </div>
                  <div className="font-semibold text-foreground tabular-nums">
                    {typeof maxGuests === "number" ? maxGuests : "—"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-muted-foreground">Smoking</div>
                  {typeof smokingAllowed === "boolean" ? (
                    <div className={`font-semibold ${smokingAllowed ? "text-green-600" : "text-red-600"}`}>
                      {smokingAllowed ? "Yes" : "No"}
                    </div>
                  ) : (
                    <div className="font-semibold text-foreground">—</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground">Events</div>
                  {typeof eventsAllowed === "boolean" ? (
                    <div className={`font-semibold ${eventsAllowed ? "text-green-600" : "text-red-600"}`}>
                      {eventsAllowed ? "Yes" : "No"}
                    </div>
                  ) : (
                    <div className="font-semibold text-foreground">—</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground">Pets</div>
                  {typeof petsAllowed === "boolean" ? (
                    <div className={`font-semibold ${petsAllowed ? "text-green-600" : "text-red-600"}`}>
                      {petsAllowed ? "Yes" : "No"}
                    </div>
                  ) : (
                    <div className="font-semibold text-foreground">—</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="space-y-0.5 md:space-y-1">
          <div className="flex items-baseline gap-0.5 md:gap-1">
            <span className="text-[10px] md:text-lg font-bold text-foreground">
              {formatMoneyWithConversion(price, originalCurrency, preferredCurrency, usdRates)}
            </span>
            <span className="text-[8px] md:text-sm text-muted-foreground">{t("common.perNight")}</span>
          </div>
          {pricePerPerson && pricePerPerson > 0 ? (
            <div className="hidden md:flex items-baseline gap-1">
              <span className="text-sm font-semibold text-foreground">
                {formatMoneyWithConversion(pricePerPerson, originalCurrency, preferredCurrency, usdRates)}
              </span>
              <span className="text-xs text-muted-foreground">per person</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!id) return content;

  return (
    <Link to={`/properties/${id}`} className="block" aria-label={title}>
      {content}
    </Link>
  );
};

export default PropertyCard;
