-- First drop the old function
DROP FUNCTION IF EXISTS public.get_all_sessions_public();

-- Then create with new signature
CREATE OR REPLACE FUNCTION public.get_all_sessions_public()
RETURNS TABLE (
  id uuid,
  name text,
  share_code text,
  created_at timestamptz,
  has_pin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.share_code,
    s.created_at,
    (s.pin_code IS NOT NULL AND s.pin_code != '') as has_pin
  FROM public.sessions s
  ORDER BY s.created_at DESC;
END;
$$;