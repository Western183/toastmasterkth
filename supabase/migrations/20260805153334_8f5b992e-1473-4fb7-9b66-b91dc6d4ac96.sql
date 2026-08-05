ALTER TABLE public.tempo_items ADD COLUMN IF NOT EXISTS video_link text;

DROP FUNCTION IF EXISTS public.get_tempo_items_for_session(uuid);

CREATE OR REPLACE FUNCTION public.get_tempo_items_for_session(p_session_id uuid)
 RETURNS TABLE(id uuid, session_id uuid, order_index integer, title text, page text, note text, video_count integer, live_count integer, person_id uuid, done boolean, link text, video_link text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT t.id, t.session_id, t.order_index, t.title, t.page, t.note,
    t.video_count, t.live_count, t.person_id, t.done, t.link, t.video_link, t.created_at, t.updated_at
  FROM public.tempo_items t
  WHERE t.session_id = p_session_id
  ORDER BY t.order_index ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_tempo_item_with_token(p_session_id uuid, p_edit_token text, p_order_index integer, p_title text, p_page text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_video_count integer DEFAULT NULL::integer, p_live_count integer DEFAULT NULL::integer, p_person_id uuid DEFAULT NULL::uuid, p_link text DEFAULT NULL::text, p_video_link text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_valid boolean;
  v_new_id uuid;
BEGIN
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = p_session_id;

  IF NOT COALESCE(v_valid, false) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.tempo_items (session_id, order_index, title, page, note, video_count, live_count, person_id, link, video_link)
  VALUES (p_session_id, p_order_index, p_title, p_page, p_note, p_video_count, p_live_count, p_person_id, NULLIF(p_link, ''), NULLIF(p_video_link, ''))
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_tempo_item_with_token(p_item_id uuid, p_edit_token text, p_title text DEFAULT NULL::text, p_page text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_video_count integer DEFAULT NULL::integer, p_live_count integer DEFAULT NULL::integer, p_person_id uuid DEFAULT NULL::uuid, p_order_index integer DEFAULT NULL::integer, p_done boolean DEFAULT NULL::boolean, p_link text DEFAULT NULL::text, p_video_link text DEFAULT NULL::text)
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
    page = CASE WHEN p_page = '' THEN NULL WHEN p_page IS NOT NULL THEN p_page ELSE page END,
    note = CASE WHEN p_note = '' THEN NULL WHEN p_note IS NOT NULL THEN p_note ELSE note END,
    link = CASE WHEN p_link = '' THEN NULL WHEN p_link IS NOT NULL THEN p_link ELSE link END,
    video_link = CASE WHEN p_video_link = '' THEN NULL WHEN p_video_link IS NOT NULL THEN p_video_link ELSE video_link END,
    video_count = CASE WHEN p_video_count = -1 THEN NULL WHEN p_video_count IS NOT NULL THEN p_video_count ELSE video_count END,
    live_count = CASE WHEN p_live_count = -1 THEN NULL WHEN p_live_count IS NOT NULL THEN p_live_count ELSE live_count END,
    person_id = CASE WHEN p_person_id = v_nil_uuid THEN NULL WHEN p_person_id IS NOT NULL THEN p_person_id ELSE person_id END,
    order_index = COALESCE(p_order_index, order_index),
    done = COALESCE(p_done, done),
    updated_at = now()
  WHERE id = p_item_id;

  RETURN true;
END;
$function$;