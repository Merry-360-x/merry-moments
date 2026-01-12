import { useEffect, useState } from "react";
import { Star, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { useFavorites } from "@/hooks/useFavorites";
import { usePreferences } from "@/hooks/usePreferences";
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
  currency?: string;
  type: string;
  bedrooms?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

const PropertyCard = ({
  id,
  image,
  title,
  location,
  rating,
  reviews,
  price,
  currency = "RWF",
  type,
  images,
  bedrooms,
  beds,
  bathrooms,
  isFavorited,
  onToggleFavorite,
}: PropertyCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currency: preferredCurrency } = usePreferences();
  const { toggleFavorite, checkFavorite } = useFavorites();
  const [fav, setFav] = useState(Boolean(isFavorited));

  const gallery = images?.length ? images : image ? [image] : [];
  const displayCurrency = currency ?? preferredCurrency;

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
    <div className="group rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300 animate-fade-in">
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
          className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          aria-label={t("actions.favorites")}
        >
          <Heart
            className={`w-4 h-4 ${fav ? "fill-primary text-primary" : "text-foreground"}`}
          />
        </button>
        <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium">
          {type}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="text-sm font-medium">{rating}</span>
            <span className="text-sm text-muted-foreground">({reviews})</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{extractNeighborhood(location)}</p>
        {(bedrooms || beds || bathrooms) ? (
          <p className="text-xs text-muted-foreground mb-3">
            {[bedrooms ? `${bedrooms} bd` : null, beds ? `${beds} beds` : null, bathrooms ? `${bathrooms} bath` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground">
            {displayCurrency} {price.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">{t("common.perNight")}</span>
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
