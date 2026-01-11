-- Grant initial roles by email (idempotent).
-- Admins:
-- - bebisdavy@gmail.com
-- - fideliranzii@gmail.com
-- - ocb04@yahoo.com
--
-- Hosts:
-- - davyncidavy@gmail.com
-- - merry360x.marketing@yahoo.com
-- - firanzi53@gmail.com

DO $$
DECLARE
  u RECORD;
BEGIN
  -- Admin role grants
  FOR u IN
    SELECT id, email
    FROM auth.users
    WHERE lower(email) IN (
      'bebisdavy@gmail.com',
      'fideliranzii@gmail.com',
      'ocb04@yahoo.com'
    )
  LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (u.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  -- Host role grants
  FOR u IN
    SELECT id, email
    FROM auth.users
    WHERE lower(email) IN (
      'davyncidavy@gmail.com',
      'merry360x.marketing@yahoo.com',
      'firanzi53@gmail.com'
    )
  LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (u.id, 'host')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END$$;

