import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useFavorites } from "@/hooks/useFavorites";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface FavoriteProperty {
  id: string;
  properties: {
    id: string;
    title: string;
    location: string;
    price_per_night: number;
    currency: string | null;
    property_type: string;
    rating: number;
    review_count: number;
    images: string[];
    host_id: string | null;
  };
}

const Favorites = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { toggleFavorite } = useFavorites();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites-full", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, properties(id, title, location, price_per_night, currency, property_type, rating, review_count, images, host_id)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as FavoriteProperty[]) ?? [];
    },
    placeholderData: [],
  });

  // if (authLoading) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("favorites.title")}</h1>
        <p className="text-muted-foreground mb-8">{t("favorites.subtitle")}</p>

        {/* {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : */ favorites.length === 0 ? (
          <div className="py-20 text-center">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">{t("favorites.emptyTitle")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("favorites.emptySubtitle")}
            </p>
            <Button onClick={() => navigate("/accommodations")}>{t("favorites.browse")}</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {favorites.map((fav) => (
              <PropertyCard
                key={fav.id}
                id={fav.properties.id}
                image={fav.properties.images?.[0] ?? null}
                images={fav.properties.images ?? null}
                title={fav.properties.title}
                location={fav.properties.location}
                rating={Number(fav.properties.rating) || 0}
                reviews={fav.properties.review_count || 0}
                price={Number(fav.properties.price_per_night)}
                currency={fav.properties.currency || "RWF"}
                type={fav.properties.property_type}
                hostId={fav.properties.host_id || null}
                isFavorited
                onToggleFavorite={async () => {
                  const changed = await toggleFavorite(String(fav.properties.id), true);
                  if (!changed) return;
                  setFavorites((prev) => prev.filter((x) => x.id !== fav.id));
                  if (user?.id) {
                    await qc.invalidateQueries({ queryKey: ["favorites", "ids", user.id] });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Favorites;
