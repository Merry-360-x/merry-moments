-- Fix support_tickets table - add missing id column if it doesn't exist
DO $$ 
BEGIN
    -- Check if id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'support_tickets' 
        AND column_name = 'id'
    ) THEN
        -- Add id column as UUID with default
        ALTER TABLE support_tickets 
        ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
        
        RAISE NOTICE 'Added id column to support_tickets table';
    ELSE
        RAISE NOTICE 'id column already exists in support_tickets table';
    END IF;
END $$;
