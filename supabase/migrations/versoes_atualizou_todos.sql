-- Controle de execução do "Atualizar todos" por versão.
-- Se true, o botão "Atualizar todos" não é exibido para essa versão.

ALTER TABLE public."versoes_SAAS_Agentes"
ADD COLUMN IF NOT EXISTS "atualizou_todos" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public."versoes_SAAS_Agentes"."atualizou_todos" IS 'Se true, o fluxo Atualizar todos já foi executado para esta versão.';
