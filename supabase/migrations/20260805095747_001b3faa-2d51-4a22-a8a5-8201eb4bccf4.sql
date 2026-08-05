-- Backwards compatibility for already-published app builds.
-- Never returns pin_code or edit_token, and never confirms a PIN as valid
-- (PIN verification must go through verify_session_pin_with_token, which rate limits).
CREATE OR REPLACE FUNCTION public.verify_session_pin(p_session_id uuid, p_pin_code text)
RETURNS TABLE(id uuid, name text, share_code text, created_at timestamp with time zone, pin_is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.share_code, s.created_at, false AS pin_is_valid
  FROM public.sessions s
  WHERE s.id = p_session_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.verify_session_pin(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_session_pin(uuid, text) TO anon, authenticated, service_role;