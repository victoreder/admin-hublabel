-- Tabela de vendedores (somente nome)
CREATE TABLE IF NOT EXISTS public.vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE
);

ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver vendedores"
  ON public.vendedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir vendedores"
  ON public.vendedores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar vendedores"
  ON public.vendedores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem excluir vendedores"
  ON public.vendedores FOR DELETE TO authenticated USING (true);

-- Adicionar coluna data_venda na tabela vendas (padrão: hoje)
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS data_venda DATE NOT NULL DEFAULT CURRENT_DATE;

-- Percentual da taxa checkout (ex.: 5 = 5%) para cálculo de faturamento líquido
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS percentual_taxa_checkout DECIMAL(5,2) NOT NULL DEFAULT 0;
