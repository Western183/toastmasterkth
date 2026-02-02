-- Create a new RPC function that returns edit_token when PIN is verified
CREATE OR REPLACE FUNCTION public.verify_session_pin_with_token(
  p_session_id uuid,
  p_pin_code text
)
RETURNS TABLE (
  id uuid,
  name text,
  share_code text,
  created_at timestamptz,
  pin_is_valid boolean,
  edit_token text
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
    (s.pin_code = p_pin_code) as pin_is_valid,
    CASE 
      WHEN s.pin_code = p_pin_code THEN s.edit_token 
      ELSE NULL 
    END as edit_token
  FROM public.sessions s
  WHERE s.id = p_session_id;
END;
$$;