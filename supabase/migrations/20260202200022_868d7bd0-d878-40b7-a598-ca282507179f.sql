-- Fix update_tempo_done to require edit_token authorization
-- This prevents unauthorized users from toggling task completion

DROP FUNCTION IF EXISTS public.update_tempo_done(uuid, boolean);

CREATE OR REPLACE FUNCTION public.update_tempo_done(
  p_item_id uuid,
  p_done boolean,
  p_edit_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_valid boolean;
BEGIN
  -- Get session_id for this tempo item
  SELECT session_id INTO v_session_id
  FROM public.tempo_items
  WHERE id = p_item_id;
  
  IF v_session_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify edit token
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = v_session_id;
  
  IF NOT COALESCE(v_valid, false) THEN
    RETURN false;
  END IF;
  
  UPDATE public.tempo_items
  SET done = p_done, updated_at = now()
  WHERE id = p_item_id;
  
  RETURN FOUND;
END;
$$;