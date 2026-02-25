-- Armazena URLs de arquivos enviados na criação da instalação (Supabase Storage).

ALTER TABLE public.instalacoes
  ADD COLUMN IF NOT EXISTS arquivos jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.instalacoes.arquivos IS 'Array de { "name": string, "url": string } com arquivos enviados no upload.';
