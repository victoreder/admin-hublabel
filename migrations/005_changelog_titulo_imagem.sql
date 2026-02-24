-- Título da entrada do changelog e URL da imagem (estilo ClipBook)
ALTER TABLE public."versoes_SAAS_Agentes"
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS url_imagem TEXT;
