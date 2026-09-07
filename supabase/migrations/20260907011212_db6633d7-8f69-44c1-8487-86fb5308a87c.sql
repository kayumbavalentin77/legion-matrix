CREATE TABLE IF NOT EXISTS public.search_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_presets TO authenticated;
GRANT ALL ON public.search_presets TO service_role;

ALTER TABLE public.search_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own presets"
ON public.search_presets FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_search_presets
BEFORE UPDATE ON public.search_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();