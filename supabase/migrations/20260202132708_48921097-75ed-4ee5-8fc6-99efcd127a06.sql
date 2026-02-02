-- Add DELETE policy for sessions table
CREATE POLICY "Anyone can delete sessions" 
ON public.sessions 
FOR DELETE 
USING (true);