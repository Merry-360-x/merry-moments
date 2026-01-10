import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const toggleFavorite = async (propertyId: string, isFavorited: boolean) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Please sign in",
        description: "You need to be logged in to save favorites.",
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
        toast({ variant: "destructive", title: "Error", description: error.message });
        return false;
      }

      toast({ title: "Removed from favorites" });
      return true;
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, property_id: propertyId });

      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        return false;
      }

      toast({ title: "Added to favorites" });
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
