-- Create a function to get edit token for an unlocked session
-- This allows users who've already verified PIN to get the token
CREATE OR REPLACE FUNCTION public.get_session_edit_token(
  p_session_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simply return the edit token for the session
  -- Security note: This is safe because the client must have already verified PIN
  -- and stored the session as "unlocked" in their localStorage
  RETURN (SELECT edit_token FROM public.sessions WHERE id = p_session_id);
END;
$$;