-- Adiciona flag Coletar Acessos à tabela instalacoes.

ALTER TABLE public.instalacoes
  ADD COLUMN IF NOT EXISTS coletar_acessos boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.instalacoes.coletar_acessos IS 'Se true, exibe tag "Coletar Acessos" indicando que os acessos ainda devem ser coletados.';
