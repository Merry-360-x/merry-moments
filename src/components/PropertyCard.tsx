import { useEffect, useMemo, useState } from "react";
import { Star, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { useFavorites } from "@/hooks/useFavorites";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";
import { formatMoney } from "@/lib/money";
import { extractNeighborhood } from "@/lib/location";

export interface PropertyCardProps {
  id?: string;
  image?: string | null;
  images?: string[] | null;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  pricePeriod?: "night" | "month";
  pricePerPerson?: number | null;
  currency?: string;
  type: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  hostId?: string | null;
  showHostVerifiedBadge?: boolean;
  priority?: boolean;
}

const PropertyCard = ({
  id,
  image,
  title,
  location,
  rating,
  price,
  pricePeriod = "night",
  currency = "RWF",
  type,
  images,
  isFavorited,
  onToggleFavorite,
  priority = false,
}: PropertyCardProps) => {
  const { t } = useTranslation();
  const routerLocation = useLocation();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const { toggleFavorite, checkFavorite } = useFavorites();
  const [fav, setFav] = useState(Boolean(isFavorited));

  const originalCurrency = currency || "RWF";
  const displayMoney = (amount: number, fromCurrency: string) => {
    const converted = convertAmount(amount, fromCurrency, preferredCurrency, usdRates);
    return formatMoney(converted ?? amount, converted !== null ? preferredCurrency : fromCurrency);
  };

  const gallery = images?.length ? images : image ? [image] : [];
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

  const showRating = rating > 0;
  const ratingFormatted = rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1);
  const subtitle = extractNeighborhood(location) || (type === "property" ? t("common.stay", "Stay") : location);

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
    <div className="group rounded-xl overflow-hidden bg-card">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        {gallery.length ? (
          <ListingImageCarousel
            images={gallery}
            alt={title}
            className="w-full h-full"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
        )}

        {/* Heart / Wishlist - Flutter style dark circle */}
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
          className="absolute top-2.5 right-2.5 w-[34px] h-[34px] rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          aria-label={t("actions.favorites")}
        >
          <Heart
            className="w-[18px] h-[18px]"
            style={{
              color: fav ? "#FF385C" : "#FFFFFF",
              fill: fav ? "#FF385C" : "transparent",
            }}
          />
        </button>
      </div>

      {/* Content */}
      <div className="pt-2 px-3">
        {/* Subtitle (location/type) + rating - Flutter order */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm text-foreground truncate">{subtitle}</span>
          {showRating && (
            <div className="flex items-center gap-[2px] shrink-0">
              <Star className="w-3 h-3 fill-foreground text-foreground" />
              <span className="text-xs font-medium text-foreground">{ratingFormatted}</span>
            </div>
          )}
        </div>

        {/* Title (property name) - Flutter style: normal weight, gray */}
        <p className="text-[13px] font-normal text-[#6A6A6A] truncate mt-[1px]">{title}</p>

        {/* Price - Flutter style: bold amount + period, no slash separator */}
        <div className="flex items-baseline gap-1 mt-1 whitespace-nowrap">
          <span className="text-sm font-semibold text-foreground">
            {displayMoney(price, originalCurrency)}
          </span>
          <span className="text-[13px] text-[#6A6A6A]">
            {pricePeriod === "month" ? t("common.perMonth", "month") : t("common.perNight", "night")}
          </span>
        </div>
      </div>
    </div>
  );

  if (!id) return content;

  return (
    <Link to={`/properties/${id}${forwardedQuery ? `?${forwardedQuery}` : ""}`} className="block" aria-label={title}>
      {content}
    </Link>
  );
};

export default PropertyCard;
