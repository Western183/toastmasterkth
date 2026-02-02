-- FIX 1: Remove the unsafe get_session_edit_token function that returns tokens without authorization
DROP FUNCTION IF EXISTS public.get_session_edit_token(uuid);

-- FIX 2: Disable realtime on sessions table (contains sensitive edit_token and pin_code)
-- Sessions don't need realtime - they rarely change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.sessions;
  END IF;
END $$;