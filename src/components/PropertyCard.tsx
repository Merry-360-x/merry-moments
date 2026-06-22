import { useEffect, useMemo, useState } from "react";
import { Star, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { useFavorites } from "@/hooks/useFavorites";
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
  reviews,
  price,
  pricePeriod = "night",
  pricePerPerson,
  currency = "RWF",
  type,
  images,
  isFavorited,
  onToggleFavorite,
  priority = false,
}: PropertyCardProps) => {
  const { t } = useTranslation();
  const routerLocation = useLocation();
  const { toggleFavorite, checkFavorite } = useFavorites();
  const [fav, setFav] = useState(Boolean(isFavorited));

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

  const isHighlyRated = rating >= 4.5 && reviews > 0;

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

        {/* Highly rated badge */}
        {isHighlyRated && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm text-[11px] md:text-xs font-medium">
            Highly rated
          </span>
        )}

        {/* Heart / Wishlist */}
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
      </div>

      {/* Content */}
      <div className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5 md:mb-2">
          <h3 className="font-semibold text-[13px] md:text-base text-foreground line-clamp-2">{title}</h3>
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">· {reviews} {reviews === 1 ? "review" : "reviews"}</span>
          </div>
          <div className="flex md:hidden items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-primary text-primary" />
            <span className="text-xs font-medium">{rating.toFixed(1)}</span>
          </div>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-1 line-clamp-1">{extractNeighborhood(location)}</p>

        <div className="space-y-0.5 md:space-y-1">
          <div className="flex items-baseline gap-1 md:gap-1">
            <span className="text-base md:text-lg font-bold text-foreground">
              {formatMoney(price, "RWF")}
            </span>
            <span className="text-xs md:text-sm text-muted-foreground">
              / {pricePeriod === "month" ? t("common.perMonth", "month") : t("common.perNight", "night")}
            </span>
          </div>
          {pricePerPerson && pricePerPerson > 0 ? (
            <div className="hidden md:flex items-baseline gap-1">
              <span className="text-sm font-semibold text-foreground">
                {formatMoney(pricePerPerson, "RWF")}
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
