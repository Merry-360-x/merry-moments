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

  // Sync guest cart to database when user logs in
  useEffect(() => {
    if (user) {
      const items = getGuestCart();
      if (items.length > 0) {
        // Migrate guest cart to database with bulk insert
        (async () => {
          try {
            const cartItems = items.map(item => ({
              user_id: user.id,
              item_type: item.item_type,
              reference_id: item.reference_id,
              quantity: item.quantity,
            }));
            
            const { error } = await supabase
              .from("trip_cart_items")
              .insert(cartItems);
            
            if (!error) {
              clearGuestCart();
              qc.invalidateQueries({ queryKey: ["trip_cart_items", user.id] });
              qc.invalidateQueries({ queryKey: ["trip_cart_count", user.id] });
              toast({
                title: "Cart synced",
                description: `${items.length} item(s) from your guest cart have been added.`,
              });
            }
          } catch (e) {
            // Ignore errors - duplicates or other issues
            clearGuestCart();
          }
        })();
      }
    }
  }, [user, qc, toast]);

  const addToCart = useCallback(
    async (itemType: CartItemType, referenceId: string, quantity = 1) => {
      if (user) {
        // Add to database for authenticated users
        try {
          // Check if already exists to prevent duplicates
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

          const { error } = await supabase.from("trip_cart_items").insert({
            user_id: user.id,
            item_type: itemType,
            reference_id: referenceId,
            quantity,
          });
          if (error) throw error;
          
          toast({ title: "Added to Trip Cart" });
          
          // Debounce invalidation to prevent excessive refetches
          setTimeout(() => {
            qc.invalidateQueries({ queryKey: ["trip_cart_items", user.id] });
            qc.invalidateQueries({ queryKey: ["trip_cart_count", user.id] });
          }, 100);
          
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
        // Add to localStorage for guest users
        const newItem: GuestCartItem = {
          id: `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          item_type: itemType,
          reference_id: referenceId,
          quantity,
          created_at: new Date().toISOString(),
        };

        setGuestCart((prev) => {
          // Check if item already exists
          const exists = prev.some(
            (item) => item.item_type === itemType && item.reference_id === referenceId
          );
          if (exists) {
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
        // Remove from database
        try {
          const { error } = await supabase.from("trip_cart_items").delete().eq("id", itemId);
          if (error) throw error;
          
          toast({ title: "Removed from cart" });
          
          // Optimistically update cache before refetch
          qc.setQueryData(["trip_cart_items", user.id], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              rows: old.rows?.filter((row: any) => row.item?.id !== itemId) || []
            };
          });
          
          // Debounce invalidation
          setTimeout(() => {
            qc.invalidateQueries({ queryKey: ["trip_cart_items", user.id] });
            qc.invalidateQueries({ queryKey: ["trip_cart_count", user.id] });
          }, 100);
          
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
        // Remove from localStorage
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
        const { error } = await supabase.from("trip_cart_items").delete().eq("user_id", user.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["trip_cart_items", user.id] });
        qc.invalidateQueries({ queryKey: ["trip_cart_count", user.id] });
        toast({ title: "Cart cleared" });
        return true;
      } catch (e) {
        logError("tripCart.clear", e);
        toast({ variant: "destructive", title: "Could not clear cart", description: uiErrorMessage(e) });
        return false;
      }
    }
    // Guest
    try {
      clearGuestCart();
      setGuestCart([]);
      toast({ title: "Cart cleared" });
      return true;
    } catch {
      setGuestCart([]);
      return true;
    }
  }, [user, qc, toast]);

  const cartItemCount = user ? 0 : guestCart.length; // For guests, show count; for users, query handles it

  return {
    guestCart,
    addToCart,
    removeFromCart,
    clearCart,
    cartItemCount,
    isGuest: !user,
  };
}
