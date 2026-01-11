import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const toggleFavorite = async (propertyId: string, isFavorited: boolean) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: t("favorites.toast.signInTitle"),
        description: t("favorites.toast.signInDescription"),
      });
      return false;
    }

    if (isFavorited) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("property_id", propertyId);

      if (error) {
        logError("favorites.delete", error);
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: uiErrorMessage(error, t("common.somethingWentWrong")),
        });
        return false;
      }

      toast({ title: t("favorites.toast.removed") });
      return true;
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, property_id: propertyId });

      if (error) {
        logError("favorites.insert", error);
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: uiErrorMessage(error, t("common.somethingWentWrong")),
        });
        return false;
      }

      toast({ title: t("favorites.toast.added") });
      return true;
    }
  };

  const checkFavorite = async (propertyId: string) => {
    if (!user) return false;

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .maybeSingle();

    return !!data;
  };

  return { toggleFavorite, checkFavorite };
};
