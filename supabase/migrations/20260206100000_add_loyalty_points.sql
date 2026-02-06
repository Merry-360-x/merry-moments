-- Create loyalty_points table to track user points
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create loyalty_transactions table to track point history
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'bonus')),
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own points
CREATE POLICY "Users can view own loyalty points"
  ON loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read their own transactions
CREATE POLICY "Users can view own loyalty transactions"
  ON loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role can manage loyalty points"
  ON loyalty_points FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage loyalty transactions"
  ON loyalty_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to add points
CREATE OR REPLACE FUNCTION add_loyalty_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Insert or update loyalty_points
  INSERT INTO loyalty_points (user_id, points, total_earned)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    points = loyalty_points.points + p_points,
    total_earned = loyalty_points.total_earned + p_points,
    updated_at = NOW();

  -- Record transaction
  INSERT INTO loyalty_transactions (user_id, points, type, reason, reference_id)
  VALUES (p_user_id, p_points, 'earn', p_reason, p_reference_id);

  -- Return new balance
  SELECT points INTO new_balance FROM loyalty_points WHERE user_id = p_user_id;
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem points
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Check balance
  SELECT points INTO current_balance FROM loyalty_points WHERE user_id = p_user_id;
  
  IF current_balance IS NULL OR current_balance < p_points THEN
    RETURN FALSE;
  END IF;

  -- Deduct points
  UPDATE loyalty_points
  SET 
    points = points - p_points,
    total_redeemed = total_redeemed + p_points,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO loyalty_transactions (user_id, points, type, reason, reference_id)
  VALUES (p_user_id, -p_points, 'redeem', p_reason, p_reference_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_loyalty_points TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_loyalty_points TO authenticated;

-- Add profile_completed flag to track one-time bonus
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed_bonus BOOLEAN DEFAULT FALSE;
