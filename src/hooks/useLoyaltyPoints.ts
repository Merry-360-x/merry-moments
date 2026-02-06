import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface LoyaltyPoints {
  points: number;
  totalEarned: number;
  totalRedeemed: number;
}

export interface LoyaltyTransaction {
  id: string;
  points: number;
  type: 'earn' | 'redeem' | 'expire' | 'bonus';
  reason: string;
  reference_id?: string;
  created_at: string;
}

// Conversion rate: 100 points = 1 USD (or equivalent)
export const POINTS_TO_USD = 100;
export const MIN_REDEEM_POINTS = 500; // Minimum points to redeem (5 USD)

export function useLoyaltyPoints() {
  const { user } = useAuth();
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoints | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    if (!user?.id) {
      setLoyaltyPoints(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase
        .from("loyalty_points")
        .select("points, total_earned, total_redeemed")
        .eq("user_id", user.id)
        .maybeSingle() as any);

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching loyalty points:", error);
      }

      setLoyaltyPoints(data ? {
        points: data.points || 0,
        totalEarned: data.total_earned || 0,
        totalRedeemed: data.total_redeemed || 0,
      } : { points: 0, totalEarned: 0, totalRedeemed: 0 });
    } catch (e) {
      console.error("Error fetching loyalty points:", e);
      setLoyaltyPoints({ points: 0, totalEarned: 0, totalRedeemed: 0 });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await (supabase
      .from("loyalty_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50) as any);

    setTransactions(data || []);
  }, [user?.id]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const addPoints = useCallback(async (
    points: number,
    reason: string,
    referenceId?: string
  ): Promise<number | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase.rpc('add_loyalty_points', {
        p_user_id: user.id,
        p_points: points,
        p_reason: reason,
        p_reference_id: referenceId || null,
      });

      if (error) throw error;

      // Refresh points
      await fetchPoints();
      return data as number;
    } catch (e) {
      console.error("Error adding loyalty points:", e);
      return null;
    }
  }, [user?.id, fetchPoints]);

  const redeemPoints = useCallback(async (
    points: number,
    reason: string,
    referenceId?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('redeem_loyalty_points', {
        p_user_id: user.id,
        p_points: points,
        p_reason: reason,
        p_reference_id: referenceId || null,
      });

      if (error) throw error;

      // Refresh points
      await fetchPoints();
      return data as boolean;
    } catch (e) {
      console.error("Error redeeming loyalty points:", e);
      return false;
    }
  }, [user?.id, fetchPoints]);

  // Convert points to currency value
  const pointsToValue = useCallback((points: number, currency: string = 'USD'): number => {
    const usdValue = points / POINTS_TO_USD;
    // For RWF, multiply by approximate rate
    if (currency === 'RWF') {
      return Math.floor(usdValue * 1300);
    }
    return usdValue;
  }, []);

  // Check if user can redeem
  const canRedeem = loyaltyPoints && loyaltyPoints.points >= MIN_REDEEM_POINTS;

  return {
    loyaltyPoints,
    transactions,
    loading,
    addPoints,
    redeemPoints,
    fetchPoints,
    fetchTransactions,
    pointsToValue,
    canRedeem,
    MIN_REDEEM_POINTS,
    POINTS_TO_USD,
  };
}
