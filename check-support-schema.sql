-- Check if support_tickets table exists and its schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'support_tickets'
ORDER BY ordinal_position;
