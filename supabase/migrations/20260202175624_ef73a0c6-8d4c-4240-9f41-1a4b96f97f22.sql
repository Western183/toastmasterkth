-- Add pin_code to sessions (4 digit user-defined PIN)
ALTER TABLE public.sessions ADD COLUMN pin_code text;

-- Add live_count to tempo_items (like video_count)
ALTER TABLE public.tempo_items ADD COLUMN live_count integer;