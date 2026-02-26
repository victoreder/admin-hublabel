-- Logs do fluxo "Atualizar todos" (POST criar-workflow2 + email).

CREATE TABLE IF NOT EXISTS public.atualizacao_todos_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id bigint NOT NULL REFERENCES public."versoes_SAAS_Agentes"(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public."usuarios_SAAS_Agentes"(id) ON DELETE CASCADE,
  status_atualizacao text NOT NULL CHECK (status_atualizacao IN ('sucesso', 'erro')),
  mensagem_atualizacao text,
  status_email text NOT NULL DEFAULT 'pendente' CHECK (status_email IN ('pendente', 'sucesso', 'erro')),
  mensagem_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.atualizacao_todos_logs IS 'Logs do fluxo Atualizar todos: resultado do POST criar-workflow2 e do envio de email.';

ALTER TABLE public.atualizacao_todos_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atualizacao_todos_logs_authenticated_read" ON public.atualizacao_todos_logs;
CREATE POLICY "atualizacao_todos_logs_authenticated_read"
  ON public.atualizacao_todos_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_atualizacao_todos_logs_versao ON public.atualizacao_todos_logs(versao_id);
CREATE INDEX IF NOT EXISTS idx_atualizacao_todos_logs_cliente ON public.atualizacao_todos_logs(cliente_id);
CREATE INDEX IF NOT EXISTS idx_atualizacao_todos_logs_created ON public.atualizacao_todos_logs(created_at DESC);
