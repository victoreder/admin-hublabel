-- Adiciona prioridade (urgente | normal) à tabela instalacoes.

ALTER TABLE public.instalacoes
  ADD COLUMN IF NOT EXISTS prioridade text NOT NULL DEFAULT 'normal'
  CHECK (prioridade IN ('urgente', 'normal'));

COMMENT ON COLUMN public.instalacoes.prioridade IS 'Prioridade da instalação: urgente ou normal.';
