-- 1. Allow anyone to obtain the edit token for a session (PIN protection removed)
CREATE OR REPLACE FUNCTION public.get_session_edit_token(p_session_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT edit_token FROM public.sessions WHERE id = p_session_id;
$$;

REVOKE ALL ON FUNCTION public.get_session_edit_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_session_edit_token(uuid) TO anon, authenticated;

-- 2. Clear all PIN codes
UPDATE public.sessions SET pin_code = NULL;

-- 3. Remove the ability to delete sittningar from the app
DROP FUNCTION IF EXISTS public.delete_session_with_token(uuid, text);

-- 4. Remove PIN verification functions
DROP FUNCTION IF EXISTS public.verify_session_pin_with_token(uuid, text);
DROP FUNCTION IF EXISTS public.verify_session_pin(uuid, text);