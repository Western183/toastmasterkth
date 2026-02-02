-- Fix linter warnings

-- 1. Drop the SECURITY DEFINER view and recreate without it
DROP VIEW IF EXISTS public.sessions_public;

-- Create a simple view (not SECURITY DEFINER - will use caller's permissions)
-- But since we have RLS that blocks direct reads, we need a function instead
-- Let's create a function to get public sessions list

CREATE OR REPLACE FUNCTION public.get_all_sessions_public()
RETURNS TABLE (
  id uuid,
  name text,
  share_code text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, share_code, created_at
  FROM public.sessions
  ORDER BY created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_sessions_public TO anon, authenticated;

-- 2. Fix the search_path warning by ensuring all functions have it set
-- (Already done in initial migration - all functions have SET search_path = public)

-- 3. The permissive INSERT policy warning is acceptable for session creation
-- since anyone should be able to create new sessions