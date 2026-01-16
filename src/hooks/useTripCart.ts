import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { logError, uiErrorMessage } from "@/lib/ui-errors";

export type CartItemType = "tour" | "property" | "transport_vehicle" | "transport_route" | "transport_service";

export interface GuestCartItem {
  id: string;
  item_type: CartItemType;
  reference_id: string;
  quantity: number;
  created_at: string;
}

const GUEST_CART_KEY = "merry360_guest_cart";

// Get guest cart from localStorage
export function getGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save guest cart to localStorage
function saveGuestCart(items: GuestCartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

// Clear guest cart (e.g., after login)
export function clearGuestCart() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function useTripCart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [guestCart, setGuestCart] = useState<GuestCartItem[]>([]);

  // Load guest cart on mount
  useEffect(() => {
    if (!user) {
      setGuestCart(getGuestCart());
    }
  }, [user]);

  // Sync guest cart to database when user logs in (bulk insert)
  useEffect(() => {
    if (user) {
      const items = getGuestCart();
      if (items.length > 0) {
        (async () => {
          try {
            const cartItems = items.map(item => ({
              user_id: user.id,
              item_type: item.item_type,
              reference_id: item.reference_id,
              quantity: item.quantity,
            }));
            
            await supabase.from("trip_cart_items").insert(cartItems);
            clearGuestCart();
            qc.invalidateQueries({ queryKey: ["trip_cart"] });
            toast({
              title: "Cart synced",
              description: `${items.length} item(s) added to your cart.`,
            });
          } catch {
            clearGuestCart();
          }
        })();
      }
    }
  }, [user, qc, toast]);

  const addToCart = useCallback(
    async (itemType: CartItemType, referenceId: string, quantity = 1) => {
      if (user) {
        try {
          // Check for duplicates
          const { data: existing } = await supabase
            .from("trip_cart_items")
            .select("id")
            .eq("user_id", user.id)
            .eq("item_type", itemType)
            .eq("reference_id", referenceId)
            .maybeSingle();
          
          if (existing) {
            toast({ title: "Already in Trip Cart" });
            return true;
          }

          await supabase.from("trip_cart_items").insert({
            user_id: user.id,
            item_type: itemType,
            reference_id: referenceId,
            quantity,
          });
          
          toast({ title: "Added to Trip Cart" });
          qc.invalidateQueries({ queryKey: ["trip_cart"] });
          return true;
        } catch (e) {
          logError("tripCart.add", e);
          toast({
            variant: "destructive",
            title: "Could not add to cart",
            description: uiErrorMessage(e),
          });
          return false;
        }
      } else {
        // Guest cart
        const newItem: GuestCartItem = {
          id: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          item_type: itemType,
          reference_id: referenceId,
          quantity,
          created_at: new Date().toISOString(),
        };

        setGuestCart((prev) => {
          if (prev.some((item) => item.item_type === itemType && item.reference_id === referenceId)) {
            toast({ title: "Already in cart" });
            return prev;
          }
          const updated = [newItem, ...prev];
          saveGuestCart(updated);
          toast({ title: "Added to Trip Cart" });
          return updated;
        });
        return true;
      }
    },
    [user, toast, qc]
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      if (user) {
        try {
          await supabase.from("trip_cart_items").delete().eq("id", itemId);
          toast({ title: "Removed from cart" });
          qc.invalidateQueries({ queryKey: ["trip_cart"] });
          return true;
        } catch (e) {
          logError("tripCart.remove", e);
          toast({
            variant: "destructive",
            title: "Could not remove item",
            description: uiErrorMessage(e),
          });
          return false;
        }
      } else {
        setGuestCart((prev) => {
          const updated = prev.filter((item) => item.id !== itemId);
          saveGuestCart(updated);
          toast({ title: "Removed from cart" });
          return updated;
        });
        return true;
      }
    },
    [user, toast, qc]
  );

  const clearCart = useCallback(async () => {
    if (user) {
      try {
        await supabase.from("trip_cart_items").delete().eq("user_id", user.id);
        qc.invalidateQueries({ queryKey: ["trip_cart"] });
        toast({ title: "Cart cleared" });
        return true;
      } catch (e) {
        logError("tripCart.clear", e);
        toast({ variant: "destructive", title: "Could not clear cart", description: uiErrorMessage(e) });
        return false;
      }
    }
    // Guest
    clearGuestCart();
    setGuestCart([]);
    toast({ title: "Cart cleared" });
    return true;
  }, [user, qc, toast]);

  return {
    guestCart,
    addToCart,
    removeFromCart,
    clearCart,
  };
}
