
CREATE OR REPLACE FUNCTION public.update_tempo_item_with_token(
  p_item_id uuid,
  p_edit_token text,
  p_title text DEFAULT NULL::text,
  p_page text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text,
  p_video_count integer DEFAULT NULL::integer,
  p_live_count integer DEFAULT NULL::integer,
  p_person_id uuid DEFAULT NULL::uuid,
  p_order_index integer DEFAULT NULL::integer,
  p_done boolean DEFAULT NULL::boolean
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id uuid;
  v_valid boolean;
  v_nil_uuid uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  SELECT session_id INTO v_session_id
  FROM public.tempo_items
  WHERE id = p_item_id;

  IF v_session_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = v_session_id;

  IF NOT COALESCE(v_valid, false) THEN
    RETURN false;
  END IF;

  UPDATE public.tempo_items
  SET
    title = COALESCE(p_title, title),
    page = CASE
      WHEN p_page = '' THEN NULL
      WHEN p_page IS NOT NULL THEN p_page
      ELSE page
    END,
    note = CASE
      WHEN p_note = '' THEN NULL
      WHEN p_note IS NOT NULL THEN p_note
      ELSE note
    END,
    video_count = CASE
      WHEN p_video_count = -1 THEN NULL
      WHEN p_video_count IS NOT NULL THEN p_video_count
      ELSE video_count
    END,
    live_count = CASE
      WHEN p_live_count = -1 THEN NULL
      WHEN p_live_count IS NOT NULL THEN p_live_count
      ELSE live_count
    END,
    person_id = CASE
      WHEN p_person_id = v_nil_uuid THEN NULL
      WHEN p_person_id IS NOT NULL THEN p_person_id
      ELSE person_id
    END,
    order_index = COALESCE(p_order_index, order_index),
    done = COALESCE(p_done, done),
    updated_at = now()
  WHERE id = p_item_id;

  RETURN true;
END;
$function$;
