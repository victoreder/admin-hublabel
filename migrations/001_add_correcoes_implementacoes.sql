-- Adiciona colunas de correções e implementações na tabela de versões
ALTER TABLE public."versoes_SAAS_Agentes" 
  ADD COLUMN IF NOT EXISTS correcoes TEXT,
  ADD COLUMN IF NOT EXISTS implementacoes TEXT;
