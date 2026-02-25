-- RLS nas tabelas instalacoes e emails_agendados.
-- Rodar no SQL Editor do Supabase ou via supabase db push.

-- ========== instalacoes ==========
ALTER TABLE public.instalacoes ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver, criar, atualizar e apagar todas as linhas (painel admin).
CREATE POLICY "instalacoes_authenticated_all"
  ON public.instalacoes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ========== emails_agendados ==========
ALTER TABLE public.emails_agendados ENABLE ROW LEVEL SECURITY;

-- Apenas o backend (service_role) acessa esta tabela; sem política para anon/authenticated,
-- o cliente (anon key) não consegue ler nem escrever. O service_role ignora RLS.
-- Nenhuma política adicional necessária.
