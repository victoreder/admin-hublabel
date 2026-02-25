-- Tabela de instalações (Kanban: aguardando, em_andamento, finalizado).

CREATE TABLE IF NOT EXISTS public.instalacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text,
  dominio text NOT NULL,
  acessos text,
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_andamento', 'finalizado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.instalacoes IS 'Instalações com status Kanban; dominio usado no template de acessos ao copiar.';

CREATE INDEX IF NOT EXISTS idx_instalacoes_status ON public.instalacoes (status);
