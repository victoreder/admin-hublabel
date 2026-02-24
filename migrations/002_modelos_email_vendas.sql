-- Modelos de email (para salvar e reutilizar)
CREATE TABLE IF NOT EXISTS public.modelos_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  assunto TEXT NOT NULL,
  corpo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.modelos_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver modelos de email"
  ON public.modelos_email FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir modelos de email"
  ON public.modelos_email FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar modelos de email"
  ON public.modelos_email FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem excluir modelos de email"
  ON public.modelos_email FOR DELETE TO authenticated USING (true);

-- Vendas
CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor DECIMAL(12,2) NOT NULL,
  vendedor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver vendas"
  ON public.vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir vendas"
  ON public.vendas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar vendas"
  ON public.vendas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem excluir vendas"
  ON public.vendas FOR DELETE TO authenticated USING (true);
