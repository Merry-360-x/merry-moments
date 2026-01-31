-- Add missing columns to support_tickets table for full functionality
-- This migration adds responded_at, responded_by, and ensures all needed columns exist

-- Add responded_by column (who responded to the ticket)
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES auth.users(id);

-- Add responded_at column (when the response was sent)
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Ensure category column exists
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Ensure priority column exists  
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Ensure response column exists
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS response TEXT;

-- Ensure updated_at column exists
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add index on responded_by for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_responded_by ON support_tickets(responded_by);

-- Grant staff full access to support_tickets
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Staff can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Staff can update all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin full access to tickets" ON support_tickets;
DROP POLICY IF EXISTS "Staff full access to tickets" ON support_tickets;

-- Recreate policies with proper permissions
-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own tickets
CREATE POLICY "Users can create own tickets" ON support_tickets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Staff (customer_support, admin) can view all tickets
CREATE POLICY "Staff can view all tickets" ON support_tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'customer_support')
        )
    );

-- Staff can update all tickets (respond, change status, priority)
CREATE POLICY "Staff can update all tickets" ON support_tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'customer_support')
        )
    );

-- Staff can delete tickets if needed
CREATE POLICY "Staff can delete tickets" ON support_tickets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin')
        )
    );
