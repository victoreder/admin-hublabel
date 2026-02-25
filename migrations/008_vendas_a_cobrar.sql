-- Vendas a cobrar (contas a receber): valor, vendedor, data prevista para cobrança, descrição
CREATE TABLE IF NOT EXISTS public.vendas_a_cobrar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor DECIMAL(12,2) NOT NULL,
  vendedor TEXT NOT NULL,
  data_prevista_cobranca DATE NOT NULL,
  descricao TEXT,
  percentual_taxa_checkout DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendas_a_cobrar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver vendas a cobrar"
  ON public.vendas_a_cobrar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir vendas a cobrar"
  ON public.vendas_a_cobrar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar vendas a cobrar"
  ON public.vendas_a_cobrar FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem excluir vendas a cobrar"
  ON public.vendas_a_cobrar FOR DELETE TO authenticated USING (true);
