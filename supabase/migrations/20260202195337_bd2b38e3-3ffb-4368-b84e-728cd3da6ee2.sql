-- ===========================================
-- FIX 1: Add CHECK constraints for server-side input validation
-- ===========================================

-- Session name: max 200 chars, min 1 char
ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_name_length CHECK (LENGTH(name) <= 200 AND LENGTH(name) > 0);

-- PIN format: must be exactly 4 digits or NULL
ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_pin_format CHECK (pin_code IS NULL OR pin_code ~ '^[0-9]{4}$');

-- Edit token: minimum 20 characters for security
ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_token_length CHECK (LENGTH(edit_token) >= 20);

-- Share code format: WORD-XXXX pattern
ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_share_code_format CHECK (share_code ~ '^[A-Z]+-[A-Z0-9]{4}$');

-- People name: max 100 chars, min 1 char
ALTER TABLE public.people 
ADD CONSTRAINT people_name_length CHECK (LENGTH(name) <= 100 AND LENGTH(name) > 0);

-- Tempo items constraints
ALTER TABLE public.tempo_items 
ADD CONSTRAINT tempo_title_length CHECK (LENGTH(title) <= 200 AND LENGTH(title) > 0);

ALTER TABLE public.tempo_items 
ADD CONSTRAINT tempo_page_length CHECK (page IS NULL OR LENGTH(page) <= 50);

ALTER TABLE public.tempo_items 
ADD CONSTRAINT tempo_note_length CHECK (note IS NULL OR LENGTH(note) <= 1000);

-- ===========================================
-- FIX 2: Add PIN brute-force protection
-- ===========================================

-- Create table to track PIN verification attempts
CREATE TABLE IF NOT EXISTS public.pin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  attempt_time timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

-- Index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_pin_attempts_session_time 
ON public.pin_attempts(session_id, attempt_time);

-- Enable RLS on pin_attempts
ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;

-- Block all direct access - only RPC can write (using standard syntax)
DROP POLICY IF EXISTS "Pin attempts insert via RPC only" ON public.pin_attempts;
CREATE POLICY "Pin attempts insert via RPC only" 
ON public.pin_attempts 
FOR INSERT 
WITH CHECK (false);

DROP POLICY IF EXISTS "Pin attempts select via RPC only" ON public.pin_attempts;
CREATE POLICY "Pin attempts select via RPC only" 
ON public.pin_attempts 
FOR SELECT 
USING (false);

-- Update verify_session_pin_with_token to include rate limiting
CREATE OR REPLACE FUNCTION public.verify_session_pin_with_token(
  p_session_id uuid,
  p_pin_code text
)
RETURNS TABLE (
  id uuid,
  name text,
  share_code text,
  created_at timestamptz,
  pin_is_valid boolean,
  edit_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_attempts int;
  v_is_valid boolean;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO v_failed_attempts
  FROM public.pin_attempts pa
  WHERE pa.session_id = p_session_id
    AND pa.attempt_time > now() - interval '15 minutes'
    AND NOT pa.success;
  
  -- Block after 5 failed attempts
  IF v_failed_attempts >= 5 THEN
    RAISE EXCEPTION 'Too many failed attempts. Please try again in 15 minutes.';
  END IF;
  
  -- Check if PIN is valid
  SELECT (s.pin_code = p_pin_code) INTO v_is_valid
  FROM public.sessions s
  WHERE s.id = p_session_id;
  
  -- Log the attempt
  INSERT INTO public.pin_attempts (session_id, success)
  VALUES (p_session_id, COALESCE(v_is_valid, false));
  
  -- Return session data
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.share_code,
    s.created_at,
    (s.pin_code = p_pin_code) as pin_is_valid,
    CASE 
      WHEN s.pin_code = p_pin_code THEN s.edit_token 
      ELSE NULL 
    END as edit_token
  FROM public.sessions s
  WHERE s.id = p_session_id;
END;
$$;

-- Clean up old attempts periodically (keep last 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_pin_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pin_attempts 
  WHERE attempt_time < now() - interval '24 hours';
END;
$$;