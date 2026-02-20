
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, credits) VALUES (NEW.id, 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  harmony_high_url TEXT,
  harmony_mid_url TEXT,
  harmony_low_url TEXT,
  key TEXT,
  scale TEXT,
  intensity TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tracks" ON public.tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tracks" ON public.tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tracks" ON public.tracks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tracks" ON public.tracks FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-files', 'audio-files', false);

-- Storage policies - users can manage their own files (stored under user_id/ prefix)
CREATE POLICY "Users can upload own audio" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can read own audio" ON storage.objects FOR SELECT USING (
  bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own audio" ON storage.objects FOR DELETE USING (
  bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
