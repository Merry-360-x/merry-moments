-- Create admin_list_users function first before granting permissions

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    is_suspended BOOLEAN,
    roles TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        au.created_at,
        au.last_sign_in_at,
        COALESCE(p.is_suspended, false) as is_suspended,
        COALESCE(
            ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL),
            ARRAY[]::TEXT[]
        ) as roles
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.user_id
    LEFT JOIN user_roles ur ON au.id = ur.user_id
    WHERE au.deleted_at IS NULL
    GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at, p.is_suspended
    ORDER BY au.created_at DESC;
END;
$$;