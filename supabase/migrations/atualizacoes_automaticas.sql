-- Controle de atualizações automáticas por cliente.
-- true = permitir atualizações automáticas; false = desativadas.

ALTER TABLE "usuarios_SAAS_Agentes"
ADD COLUMN IF NOT EXISTS "atualizacoes_automaticas" boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN "usuarios_SAAS_Agentes"."atualizacoes_automaticas" IS 'Se false, atualizações automáticas estão desativadas para este cliente.';
