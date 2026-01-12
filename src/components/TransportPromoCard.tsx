import { Link } from "react-router-dom";
import { Car } from "lucide-react";
import ListingImageCarousel from "@/components/ListingImageCarousel";
import { formatMoney } from "@/lib/money";

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
  const gallery = (props.media ?? []).filter(Boolean);
  const imgs = gallery.length ? gallery : props.imageUrl ? [props.imageUrl] : [];
  return (
    <Link to="/transport" className="block" aria-label={props.title}>
      <div className="group rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden">
          {imgs.length ? (
            <ListingImageCarousel images={imgs} alt={props.title} className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/70 to-muted/40 flex items-center justify-center">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {props.vehicleType ? (
            <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium">
              {props.vehicleType}
            </span>
          ) : null}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-foreground line-clamp-1">{props.title}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {props.vehicleType ?? "Vehicle"}
            {props.seats ? ` · ${props.seats} seats` : ""}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">
              {formatMoney(Number(props.pricePerDay ?? 0), String(props.currency ?? "RWF"))}
            </span>
            <span className="text-sm text-muted-foreground">/ day</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

