-- Create secure RPC function for session creation
CREATE OR REPLACE FUNCTION public.create_session_with_token(
  p_name text,
  p_share_code text,
  p_edit_token text,
  p_pin_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  INSERT INTO public.sessions (name, share_code, edit_token, pin_code)
  VALUES (p_name, p_share_code, p_edit_token, p_pin_code)
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- Remove the direct INSERT policy since we're using RPC now
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.sessions;

CREATE POLICY "Sessions insert via RPC only"
ON public.sessions
FOR INSERT
TO public
WITH CHECK (false);