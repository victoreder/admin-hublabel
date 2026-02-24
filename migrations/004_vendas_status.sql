-- Status da venda: ativa (conta nos totais) ou reembolsada (só aparece na lista, não conta)
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'reembolsada'));

-- Índice para filtrar por status em listagens/totais
CREATE INDEX IF NOT EXISTS idx_vendas_status ON public.vendas (status);
