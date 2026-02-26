-- Adiciona coluna para salvar a resposta da requisição criar-workflow2.

ALTER TABLE public.atualizacao_todos_logs
ADD COLUMN IF NOT EXISTS resposta_atualizacao text;

COMMENT ON COLUMN public.atualizacao_todos_logs.resposta_atualizacao IS 'Corpo da resposta da requisição POST criar-workflow2 (para debug).';
