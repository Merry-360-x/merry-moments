import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type PropertyRow = {
  id: string;
  title: string;
  location: string;
  price_per_night: number;
  currency: string | null;
  property_type: string | null;
  rating: number | null;
  review_count: number | null;
  images: string[] | null;
  description: string | null;
  is_published: boolean | null;
};

const fetchProperty = async (id: string) => {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, title, location, price_per_night, currency, property_type, rating, review_count, images, description, is_published"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as PropertyRow | null;
};

export default function PropertyDetails() {
  const { t } = useTranslation();
  const params = useParams();
  const propertyId = params.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => fetchProperty(propertyId as string),
    enabled: Boolean(propertyId),
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link to="/accommodations" className="text-primary font-medium hover:underline">
            {t("nav.accommodations")}
          </Link>
          <Link to="/favorites" className="text-muted-foreground hover:text-primary">
            {t("actions.favorites")}
          </Link>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t("common.loadingProperties")}</p>
          </div>
        ) : isError ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">{t("common.couldNotLoadProperties")}</p>
          </div>
        ) : !data ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">{t("common.noPublishedProperties")}</p>
            <div className="mt-6">
              <Link to="/accommodations">
                <Button>{t("nav.accommodations")}</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              {data.images?.[0] ? (
                <img
                  src={data.images[0]}
                  alt={data.title}
                  className="w-full h-[320px] object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-[320px] bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
              )}
              {data.images && data.images.length > 1 ? (
                <div className="grid grid-cols-3 gap-2 p-3">
                  {data.images.slice(0, 3).map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt={data.title}
                      className="h-24 w-full object-cover rounded-lg"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{data.title}</h1>
                  <p className="text-muted-foreground">{data.location}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">
                    {data.currency ?? "RWF"} {Number(data.price_per_night).toLocaleString()}
                    <span className="text-sm text-muted-foreground"> {t("common.perNight")}</span>
                  </div>
                </div>
              </div>

              {data.description ? (
                <p className="mt-6 text-foreground/90 leading-relaxed">{data.description}</p>
              ) : (
                <p className="mt-6 text-muted-foreground">
                  {t("common.noPublishedProperties")}
                </p>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/accommodations" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full">
                    {t("nav.accommodations")}
                  </Button>
                </Link>
                <Link to="/my-bookings" className="w-full sm:w-auto">
                  <Button className="w-full">{t("actions.myBookings")}</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
