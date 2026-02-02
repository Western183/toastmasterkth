-- Fix the sessions INSERT policy to be PERMISSIVE (not RESTRICTIVE)
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.sessions;

CREATE POLICY "Anyone can create sessions"
ON public.sessions
FOR INSERT
TO public
WITH CHECK (true);