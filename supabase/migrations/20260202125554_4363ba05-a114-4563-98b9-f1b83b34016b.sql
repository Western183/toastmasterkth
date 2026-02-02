-- Sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  share_code TEXT NOT NULL UNIQUE,
  edit_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- People table (sångledare med färger)
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tempo items table
CREATE TABLE public.tempo_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  page TEXT,
  note TEXT,
  video_count INTEGER,
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (alla kan läsa och skriva utan auth)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tempo_items ENABLE ROW LEVEL SECURITY;

-- Public read/write policies för sessions (ingen auth krävs)
CREATE POLICY "Anyone can read sessions" 
ON public.sessions FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create sessions" 
ON public.sessions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update sessions" 
ON public.sessions FOR UPDATE 
USING (true);

-- Public policies för people
CREATE POLICY "Anyone can read people" 
ON public.people FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create people" 
ON public.people FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update people" 
ON public.people FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete people" 
ON public.people FOR DELETE 
USING (true);

-- Public policies för tempo_items
CREATE POLICY "Anyone can read tempo_items" 
ON public.tempo_items FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create tempo_items" 
ON public.tempo_items FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update tempo_items" 
ON public.tempo_items FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete tempo_items" 
ON public.tempo_items FOR DELETE 
USING (true);

-- Enable realtime för live-synk
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.people;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tempo_items;

-- Trigger för updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tempo_items_updated_at
BEFORE UPDATE ON public.tempo_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index för snabbare lookups
CREATE INDEX idx_sessions_share_code ON public.sessions(share_code);
CREATE INDEX idx_tempo_items_session_id ON public.tempo_items(session_id);
CREATE INDEX idx_people_session_id ON public.people(session_id);