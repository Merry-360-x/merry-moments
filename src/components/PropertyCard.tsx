import { Star, Heart } from "lucide-react";

interface PropertyCardProps {
  image: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  currency?: string;
  type: string;
}

const PropertyCard = ({
  image,
  title,
  location,
  rating,
  reviews,
  price,
  currency = "RWF",
  type,
}: PropertyCardProps) => {
  return (
    <div className="group rounded-xl overflow-hidden bg-card shadow-card hover:shadow-lg transition-all duration-300 animate-fade-in">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <button className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors">
          <Heart className="w-4 h-4 text-foreground" />
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
        <p className="text-sm text-muted-foreground mb-3">{location}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground">
            {currency} {price.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">/ night</span>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
