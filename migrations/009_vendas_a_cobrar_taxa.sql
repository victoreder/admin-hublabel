-- Adicionar coluna taxa em vendas a cobrar (para quem já rodou 008)
ALTER TABLE public.vendas_a_cobrar
  ADD COLUMN IF NOT EXISTS percentual_taxa_checkout DECIMAL(5,2) DEFAULT 0;
