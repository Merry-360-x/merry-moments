import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type InfoPageKind =
  | "about"
  | "contact"
  | "help"
  | "safety"
  | "privacy"
  | "cookies"
  | "terms";

const keyByKind: Record<InfoPageKind, { title: string; body: string }> = {
  about: { title: "footer.about", body: "info.aboutBody" },
  contact: { title: "footer.contact", body: "info.contactBody" },
  help: { title: "footer.help", body: "info.helpBody" },
  safety: { title: "footer.safety", body: "info.safetyBody" },
  privacy: { title: "footer.privacy", body: "info.privacyBody" },
  cookies: { title: "footer.cookies", body: "info.cookiesBody" },
  terms: { title: "footer.terms", body: "info.termsBody" },
};

export default function InfoPage({ kind }: { kind: InfoPageKind }) {
  const { t } = useTranslation();
  const keys = keyByKind[kind];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{t(keys.title)}</h1>
        <p className="text-muted-foreground mb-8">{t(keys.body)}</p>

        <div className="flex gap-3">
          <Link to="/">
            <Button variant="outline">{t("info.backHome")}</Button>
          </Link>
          <Link to="/help">
            <Button>{t("info.getHelp")}</Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
