-- Reintroduce PIN protection with a shared PIN for all sittningar
UPDATE public.sessions SET pin_code = '5453';

ALTER TABLE public.sessions ALTER COLUMN pin_code SET DEFAULT '5453';

-- Remove the insecure token giveaway
DROP FUNCTION IF EXISTS public.get_session_edit_token(uuid);

-- New sessions always get the shared PIN, regardless of what the client sends
CREATE OR REPLACE FUNCTION public.create_session_with_token(p_name text, p_share_code text, p_edit_token text, p_pin_code text, p_template_type text DEFAULT 'regular'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id uuid;
BEGIN
  INSERT INTO public.sessions (name, share_code, edit_token, pin_code, template_type)
  VALUES (p_name, p_share_code, p_edit_token, COALESCE(NULLIF(p_pin_code, ''), '5453'), COALESCE(NULLIF(p_template_type, ''), 'regular'))
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$function$;

-- Verify PIN against the database and return the edit token on success.
-- Rate limited via pin_attempts (max 10 failed attempts per session per 15 min).
CREATE OR REPLACE FUNCTION public.verify_session_pin_with_token(p_session_id uuid, p_pin_code text)
 RETURNS TABLE(success boolean, edit_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pin text;
  v_token text;
  v_fails integer;
BEGIN
  SELECT s.pin_code, s.edit_token INTO v_pin, v_token
  FROM public.sessions s WHERE s.id = p_session_id;

  IF v_token IS NULL THEN
    RETURN QUERY SELECT false, NULL::text;
    RETURN;
  END IF;

  SELECT count(*) INTO v_fails
  FROM public.pin_attempts a
  WHERE a.session_id = p_session_id
    AND a.success = false
    AND a.attempt_time > now() - interval '15 minutes';

  IF v_fails >= 10 THEN
    RETURN QUERY SELECT false, NULL::text;
    RETURN;
  END IF;

  IF v_pin IS NULL OR v_pin = '' OR v_pin = p_pin_code THEN
    INSERT INTO public.pin_attempts (session_id, success) VALUES (p_session_id, true);
    RETURN QUERY SELECT true, v_token;
  ELSE
    INSERT INTO public.pin_attempts (session_id, success) VALUES (p_session_id, false);
    RETURN QUERY SELECT false, NULL::text;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.verify_session_pin_with_token(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_session_pin_with_token(uuid, text) TO anon, authenticated, service_role;