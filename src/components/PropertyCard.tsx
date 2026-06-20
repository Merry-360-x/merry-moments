import { useEffect, useMemo, useState } from "react";
import { Star, Heart, Users, BadgeCheck, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useFavorites } from "@/hooks/useFavorites";
import { usePreferences } from "@/hooks/usePreferences";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount } from "@/lib/fx";
import { extractNeighborhood } from "@/lib/location";
import { formatMoney } from "@/lib/money";

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
  showHostVerifiedBadge?: boolean;
  /** Pass true for above-the-fold cards to load the image eagerly at high priority */
  priority?: boolean;
}

const PropertyCard = ({
  id,
  image,
  title,
  location,
  rating,
  reviews,
  price,
  pricePeriod = "night",
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
  showHostVerifiedBadge = true,
  priority = false,
}: PropertyCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { currency: preferredCurrency } = usePreferences();
  const { usdRates } = useFxRates();
  const { toggleFavorite, checkFavorite } = useFavorites();

  const displayMoney = (amount: number, fromCurrency: string) => {
    const converted = convertAmount(amount, fromCurrency, preferredCurrency, usdRates);
    return formatMoney(converted ?? amount, converted !== null ? preferredCurrency : fromCurrency);
  };
  const [fav, setFav] = useState(Boolean(isFavorited));

  // Check if host is verified (only when hostId is provided)
  const { data: hostVerified } = useQuery({
    queryKey: ["host-verified", hostId],
    enabled: Boolean(hostId) && showHostVerifiedBadge,
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
    <motion.div
      className="group rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
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
        <motion.button
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
          className="absolute top-2 right-2 p-1.5 md:p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          aria-label={t("actions.favorites")}
          whileTap={{ scale: 1.3 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <motion.div
            animate={fav ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={`w-3.5 h-3.5 md:w-4 md:h-4 ${fav ? "fill-primary text-primary" : "text-foreground"}`}
            />
          </motion.div>
        </motion.button>
        <span className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm text-[11px] md:text-xs font-medium flex items-center gap-1">
          {type}
          {hostVerified && (
            <BadgeCheck className="w-3 h-3 md:w-4 md:h-4 text-primary" />
          )}
        </span>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5 md:mb-2">
          <h3 className="font-semibold text-[13px] md:text-base text-foreground line-clamp-1">{title}</h3>
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="text-sm font-medium">{rating}</span>
            <span className="text-sm text-muted-foreground">({reviews})</span>
          </div>
          {/* Mobile: compact rating */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-primary text-primary" />
            <span className="text-xs font-medium">{rating}</span>
          </div>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-1 line-clamp-1">{extractNeighborhood(location)}</p>
        {/* Mobile: Show beds compact */}
        {(beds || bedrooms) && (
          <p className="md:hidden text-xs text-muted-foreground mb-1">
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
          {/* Check-in / Check-out / Guests — only shown when at least one is set */}
          {(checkInTime || checkOutTime || typeof maxGuests === "number") ? (
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-2.5 text-xs text-muted-foreground">
              {(checkInTime || checkOutTime) ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="tabular-nums">
                    {checkInTime ? String(checkInTime).slice(0, 5) : "?"}
                    {" – "}
                    {checkOutTime ? String(checkOutTime).slice(0, 5) : "?"}
                  </span>
                </span>
              ) : null}
              {typeof maxGuests === "number" ? (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 shrink-0" />
                  <span>Up to {maxGuests}</span>
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Policy badges — only shown for fields that are explicitly set */}
          {(typeof smokingAllowed === "boolean" || typeof eventsAllowed === "boolean" || typeof petsAllowed === "boolean") ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {typeof smokingAllowed === "boolean" ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  smokingAllowed
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                }`}>
                  {smokingAllowed ? "✓" : "✗"} Smoking
                </span>
              ) : null}
              {typeof eventsAllowed === "boolean" ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  eventsAllowed
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                }`}>
                  {eventsAllowed ? "✓" : "✗"} Events
                </span>
              ) : null}
              {typeof petsAllowed === "boolean" ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  petsAllowed
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                }`}>
                  {petsAllowed ? "✓" : "✗"} Pets
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="space-y-0.5 md:space-y-1">
          <div className="flex items-baseline gap-1 md:gap-1">
            <span className="text-base md:text-lg font-bold text-foreground">
              {displayMoney(price, originalCurrency || "RWF")}
            </span>
            <span className="text-xs md:text-sm text-muted-foreground">
              {pricePeriod === "month" ? t("common.perMonth", "per month") : t("common.perNight")}
            </span>
          </div>
          {pricePerPerson && pricePerPerson > 0 ? (
            <div className="hidden md:flex items-baseline gap-1">
              <span className="text-sm font-semibold text-foreground">
                {displayMoney(pricePerPerson, originalCurrency || "RWF")}
              </span>
              <span className="text-xs text-muted-foreground">{t("common.perPerson", "per person")}</span>
            </div>
          ) : null}
          </div>
        </div>
      </motion.div>
  );

  if (!id) return content;

  return (
    <Link to={`/properties/${id}${forwardedQuery ? `?${forwardedQuery}` : ""}`} className="block" aria-label={title}>
      {content}
    </Link>
  );
};

export default PropertyCard;
