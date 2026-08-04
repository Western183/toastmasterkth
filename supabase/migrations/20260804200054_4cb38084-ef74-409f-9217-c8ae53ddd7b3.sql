ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'regular';
ALTER TABLE public.tempo_items ADD COLUMN IF NOT EXISTS link text;

DROP FUNCTION IF EXISTS public.create_session_with_token(text, text, text, text);
CREATE OR REPLACE FUNCTION public.create_session_with_token(p_name text, p_share_code text, p_edit_token text, p_pin_code text, p_template_type text DEFAULT 'regular')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id uuid;
BEGIN
  INSERT INTO public.sessions (name, share_code, edit_token, pin_code, template_type)
  VALUES (p_name, p_share_code, p_edit_token, p_pin_code, COALESCE(NULLIF(p_template_type, ''), 'regular'))
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_all_sessions_public();
CREATE OR REPLACE FUNCTION public.get_all_sessions_public()
 RETURNS TABLE(id uuid, name text, share_code text, created_at timestamp with time zone, has_pin boolean, template_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.share_code, s.created_at,
    (s.pin_code IS NOT NULL AND s.pin_code != '') as has_pin,
    s.template_type
  FROM public.sessions s
  ORDER BY s.created_at DESC;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_session_by_share_code(text);
CREATE OR REPLACE FUNCTION public.get_session_by_share_code(p_share_code text)
 RETURNS TABLE(id uuid, name text, share_code text, created_at timestamp with time zone, has_pin boolean, template_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.share_code, s.created_at,
    (s.pin_code IS NOT NULL AND s.pin_code != '') as has_pin,
    s.template_type
  FROM public.sessions s
  WHERE UPPER(s.share_code) = UPPER(p_share_code);
END;
$function$;

DROP FUNCTION IF EXISTS public.get_tempo_items_for_session(uuid);
CREATE OR REPLACE FUNCTION public.get_tempo_items_for_session(p_session_id uuid)
 RETURNS TABLE(id uuid, session_id uuid, order_index integer, title text, page text, note text, video_count integer, live_count integer, person_id uuid, done boolean, link text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT t.id, t.session_id, t.order_index, t.title, t.page, t.note,
    t.video_count, t.live_count, t.person_id, t.done, t.link, t.created_at, t.updated_at
  FROM public.tempo_items t
  WHERE t.session_id = p_session_id
  ORDER BY t.order_index ASC;
END;
$function$;

DROP FUNCTION IF EXISTS public.create_tempo_item_with_token(uuid, text, integer, text, text, text, integer, integer, uuid);
CREATE OR REPLACE FUNCTION public.create_tempo_item_with_token(p_session_id uuid, p_edit_token text, p_order_index integer, p_title text, p_page text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_video_count integer DEFAULT NULL::integer, p_live_count integer DEFAULT NULL::integer, p_person_id uuid DEFAULT NULL::uuid, p_link text DEFAULT NULL::text)
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

  INSERT INTO public.tempo_items (session_id, order_index, title, page, note, video_count, live_count, person_id, link)
  VALUES (p_session_id, p_order_index, p_title, p_page, p_note, p_video_count, p_live_count, p_person_id, NULLIF(p_link, ''))
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.update_tempo_item_with_token(uuid, text, text, text, text, integer, integer, uuid, integer, boolean);
CREATE OR REPLACE FUNCTION public.update_tempo_item_with_token(p_item_id uuid, p_edit_token text, p_title text DEFAULT NULL::text, p_page text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_video_count integer DEFAULT NULL::integer, p_live_count integer DEFAULT NULL::integer, p_person_id uuid DEFAULT NULL::uuid, p_order_index integer DEFAULT NULL::integer, p_done boolean DEFAULT NULL::boolean, p_link text DEFAULT NULL::text)
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