-- Restrict read access to tempo_items and people to go through secure RPCs

-- Drop the existing permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can read tempo_items" ON public.tempo_items;
DROP POLICY IF EXISTS "Anyone can read people" ON public.people;

-- Create restrictive SELECT policies (deny all direct reads)
CREATE POLICY "Tempo items read via RPC only"
ON public.tempo_items
FOR SELECT
USING (false);

CREATE POLICY "People read via RPC only"
ON public.people
FOR SELECT
USING (false);

-- Create secure RPC functions to read data (requires session access)
CREATE OR REPLACE FUNCTION public.get_tempo_items_for_session(p_session_id uuid)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  order_index integer,
  title text,
  page text,
  note text,
  video_count integer,
  live_count integer,
  person_id uuid,
  done boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.session_id,
    t.order_index,
    t.title,
    t.page,
    t.note,
    t.video_count,
    t.live_count,
    t.person_id,
    t.done,
    t.created_at,
    t.updated_at
  FROM public.tempo_items t
  WHERE t.session_id = p_session_id
  ORDER BY t.order_index ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_people_for_session(p_session_id uuid)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  name text,
  color text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.session_id,
    p.name,
    p.color,
    p.created_at
  FROM public.people p
  WHERE p.session_id = p_session_id
  ORDER BY p.created_at ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_tempo_items_for_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_people_for_session TO anon, authenticated;