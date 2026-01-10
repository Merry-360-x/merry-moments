import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function TripCart() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t("actions.tripCart")}</h1>
        <p className="text-muted-foreground mb-8">{t("tripCart.subtitle")}</p>

        <div className="bg-card rounded-xl shadow-card p-8 text-center">
          <p className="text-muted-foreground mb-6">{t("tripCart.empty")}</p>
          <Link to="/accommodations">
            <Button>{t("tripCart.browse")}</Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
