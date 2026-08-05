-- 1) Allow read access to non-sensitive tables so Realtime (postgres_changes) can deliver rows.
--    These rows are already publicly readable through the existing SECURITY DEFINER read RPCs.
GRANT SELECT ON public.people TO anon, authenticated;
GRANT SELECT ON public.tempo_items TO anon, authenticated;

DROP POLICY IF EXISTS "People read via RPC only" ON public.people;
CREATE POLICY "People are publicly readable"
ON public.people
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Tempo items read via RPC only" ON public.tempo_items;
CREATE POLICY "Tempo items are publicly readable"
ON public.tempo_items
FOR SELECT
TO anon, authenticated
USING (true);

-- 2) Lock down the internal maintenance SECURITY DEFINER function from the public API.
REVOKE ALL ON FUNCTION public.cleanup_old_pin_attempts() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.cleanup_old_pin_attempts() TO service_role;

-- 3) Remove the legacy PIN-verification function that bypassed attempt logging/limits.
DROP FUNCTION IF EXISTS public.verify_session_pin(uuid, text);

-- 4) Replacement used by the app to read public session info without any PIN handling.
CREATE OR REPLACE FUNCTION public.get_session_public(p_session_id uuid)
RETURNS TABLE(id uuid, name text, share_code text, created_at timestamp with time zone, has_pin boolean, template_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.share_code, s.created_at,
    (s.pin_code IS NOT NULL AND s.pin_code != '') AS has_pin,
    s.template_type
  FROM public.sessions s
  WHERE s.id = p_session_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_session_public(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_session_public(uuid) TO anon, authenticated, service_role;