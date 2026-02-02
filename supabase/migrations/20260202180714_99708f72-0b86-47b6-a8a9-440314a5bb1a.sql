-- =====================================================
-- SECURITY FIX: Server-side authorization without user auth
-- =====================================================

-- 1. Create a secure view for sessions that excludes sensitive fields
CREATE OR REPLACE VIEW public.sessions_public AS
SELECT 
  id,
  name,
  share_code,
  created_at
FROM public.sessions;

-- 2. Function to verify PIN and get full session (excludes edit_token)
CREATE OR REPLACE FUNCTION public.verify_session_pin(
  p_session_id uuid,
  p_pin_code text
)
RETURNS TABLE (
  id uuid,
  name text,
  share_code text,
  created_at timestamptz,
  pin_is_valid boolean
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
    (s.pin_code = p_pin_code) as pin_is_valid
  FROM public.sessions s
  WHERE s.id = p_session_id;
END;
$$;

-- 3. Function to verify edit_token (returns true/false)
CREATE OR REPLACE FUNCTION public.verify_edit_token(
  p_session_id uuid,
  p_edit_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = p_session_id;
  
  RETURN COALESCE(v_valid, false);
END;
$$;

-- 4. Function to get session by share_code (for joining)
CREATE OR REPLACE FUNCTION public.get_session_by_share_code(
  p_share_code text
)
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
  WHERE UPPER(s.share_code) = UPPER(p_share_code);
END;
$$;

-- 5. Function to delete session with token verification
CREATE OR REPLACE FUNCTION public.delete_session_with_token(
  p_session_id uuid,
  p_edit_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
BEGIN
  -- Verify token
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = p_session_id;
  
  IF NOT COALESCE(v_valid, false) THEN
    RETURN false;
  END IF;
  
  -- Delete tempo items first
  DELETE FROM public.tempo_items WHERE session_id = p_session_id;
  
  -- Delete people
  DELETE FROM public.people WHERE session_id = p_session_id;
  
  -- Delete session
  DELETE FROM public.sessions WHERE id = p_session_id;
  
  RETURN true;
END;
$$;

-- 6. Function to update tempo item with token verification
CREATE OR REPLACE FUNCTION public.update_tempo_item_with_token(
  p_item_id uuid,
  p_edit_token text,
  p_title text DEFAULT NULL,
  p_page text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_video_count integer DEFAULT NULL,
  p_live_count integer DEFAULT NULL,
  p_person_id uuid DEFAULT NULL,
  p_order_index integer DEFAULT NULL,
  p_done boolean DEFAULT NULL
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
  
  -- Verify token
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = v_session_id;
  
  IF NOT COALESCE(v_valid, false) THEN
    RETURN false;
  END IF;
  
  -- Update the tempo item (only non-null values)
  UPDATE public.tempo_items
  SET 
    title = COALESCE(p_title, title),
    page = CASE WHEN p_page IS NOT NULL THEN p_page ELSE page END,
    note = CASE WHEN p_note IS NOT NULL THEN p_note ELSE note END,
    video_count = CASE WHEN p_video_count IS NOT NULL THEN p_video_count ELSE video_count END,
    live_count = CASE WHEN p_live_count IS NOT NULL THEN p_live_count ELSE live_count END,
    person_id = CASE WHEN p_person_id IS NOT NULL THEN p_person_id ELSE person_id END,
    order_index = COALESCE(p_order_index, order_index),
    done = COALESCE(p_done, done),
    updated_at = now()
  WHERE id = p_item_id;
  
  RETURN true;
END;
$$;

-- 7. Function to update tempo item done status (anyone can mark as done if they have access)
CREATE OR REPLACE FUNCTION public.update_tempo_done(
  p_item_id uuid,
  p_done boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tempo_items
  SET done = p_done, updated_at = now()
  WHERE id = p_item_id;
  
  RETURN FOUND;
END;
$$;

-- 8. Function to create tempo item with token verification
CREATE OR REPLACE FUNCTION public.create_tempo_item_with_token(
  p_session_id uuid,
  p_edit_token text,
  p_order_index integer,
  p_title text,
  p_page text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_video_count integer DEFAULT NULL,
  p_live_count integer DEFAULT NULL,
  p_person_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
  v_new_id uuid;
BEGIN
  -- Verify token
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = p_session_id;
  
  IF NOT COALESCE(v_valid, false) THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.tempo_items (session_id, order_index, title, page, note, video_count, live_count, person_id)
  VALUES (p_session_id, p_order_index, p_title, p_page, p_note, p_video_count, p_live_count, p_person_id)
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- 9. Function to delete tempo item with token verification
CREATE OR REPLACE FUNCTION public.delete_tempo_item_with_token(
  p_item_id uuid,
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
  
  -- Verify token
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = v_session_id;
  
  IF NOT COALESCE(v_valid, false) THEN
    RETURN false;
  END IF;
  
  DELETE FROM public.tempo_items WHERE id = p_item_id;
  
  RETURN true;
END;
$$;

-- 10. Function to bulk update tempo item order with token verification
CREATE OR REPLACE FUNCTION public.update_tempo_order_with_token(
  p_session_id uuid,
  p_edit_token text,
  p_items jsonb -- array of {id: uuid, order_index: int}
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
  v_item jsonb;
BEGIN
  -- Verify token
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = p_session_id;
  
  IF NOT COALESCE(v_valid, false) THEN
    RETURN false;
  END IF;
  
  -- Update each item's order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE public.tempo_items
    SET order_index = (v_item->>'order_index')::integer, updated_at = now()
    WHERE id = (v_item->>'id')::uuid AND session_id = p_session_id;
  END LOOP;
  
  RETURN true;
END;
$$;

-- 11. Function to add person with token verification
CREATE OR REPLACE FUNCTION public.add_person_with_token(
  p_session_id uuid,
  p_edit_token text,
  p_name text,
  p_color text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
  v_new_id uuid;
BEGIN
  -- Verify token
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = p_session_id;
  
  IF NOT COALESCE(v_valid, false) THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.people (session_id, name, color)
  VALUES (p_session_id, p_name, p_color)
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- 12. Function to delete person with token verification
CREATE OR REPLACE FUNCTION public.delete_person_with_token(
  p_person_id uuid,
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
  -- Get session_id for this person
  SELECT session_id INTO v_session_id
  FROM public.people
  WHERE id = p_person_id;
  
  IF v_session_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify token
  SELECT (edit_token = p_edit_token) INTO v_valid
  FROM public.sessions
  WHERE id = v_session_id;
  
  IF NOT COALESCE(v_valid, false) THEN
    RETURN false;
  END IF;
  
  DELETE FROM public.people WHERE id = p_person_id;
  
  RETURN true;
END;
$$;

-- 13. Now restrict the RLS policies

-- Drop existing overly permissive policies on sessions
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can delete sessions" ON public.sessions;

-- Sessions: Only allow INSERT (for creating new sessions)
-- All other operations go through secure functions

-- Allow reading only id, name, share_code, created_at (no sensitive data)
-- We use a policy that returns no rows directly - use the RPC functions instead
CREATE POLICY "Sessions read via RPC only"
ON public.sessions
FOR SELECT
USING (false);

-- Keep insert for creating sessions
-- Policy already exists: "Anyone can create sessions"

-- No direct update/delete - use RPC functions
CREATE POLICY "Sessions update via RPC only"
ON public.sessions
FOR UPDATE
USING (false);

CREATE POLICY "Sessions delete via RPC only"
ON public.sessions
FOR DELETE
USING (false);

-- Drop existing overly permissive policies on tempo_items
DROP POLICY IF EXISTS "Anyone can create tempo_items" ON public.tempo_items;
DROP POLICY IF EXISTS "Anyone can update tempo_items" ON public.tempo_items;
DROP POLICY IF EXISTS "Anyone can delete tempo_items" ON public.tempo_items;

-- Tempo items: Allow read for anyone (they need PIN to access the page anyway)
-- But restrict write operations to RPC functions
-- Keep existing SELECT policy: "Anyone can read tempo_items"

CREATE POLICY "Tempo items insert via RPC only"
ON public.tempo_items
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Tempo items update via RPC only"
ON public.tempo_items
FOR UPDATE
USING (false);

CREATE POLICY "Tempo items delete via RPC only"
ON public.tempo_items
FOR DELETE
USING (false);

-- Drop existing overly permissive policies on people
DROP POLICY IF EXISTS "Anyone can create people" ON public.people;
DROP POLICY IF EXISTS "Anyone can update people" ON public.people;
DROP POLICY IF EXISTS "Anyone can delete people" ON public.people;

-- Keep read access for people
-- But restrict write operations
CREATE POLICY "People insert via RPC only"
ON public.people
FOR INSERT
WITH CHECK (false);

CREATE POLICY "People update via RPC only"
ON public.people
FOR UPDATE
USING (false);

CREATE POLICY "People delete via RPC only"
ON public.people
FOR DELETE
USING (false);

-- 14. Grant execute permissions on functions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.verify_session_pin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_edit_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_by_share_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_session_with_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_tempo_item_with_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_tempo_done TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_tempo_item_with_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tempo_item_with_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_tempo_order_with_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_person_with_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_person_with_token TO anon, authenticated;

-- 15. Grant access to the public view
GRANT SELECT ON public.sessions_public TO anon, authenticated;