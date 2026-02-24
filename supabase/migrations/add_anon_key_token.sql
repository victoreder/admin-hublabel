-- Token único por cliente para o link público "Inserir Anon Key".
-- Rode este SQL no SQL Editor do Supabase.

ALTER TABLE "usuarios_SAAS_Agentes"
ADD COLUMN IF NOT EXISTS "anon_key_token" uuid UNIQUE DEFAULT gen_random_uuid();

-- Preencher tokens para linhas que ainda não têm (NULL)
UPDATE "usuarios_SAAS_Agentes"
SET "anon_key_token" = gen_random_uuid()
WHERE "anon_key_token" IS NULL;

-- Garantir que novas linhas tenham token
ALTER TABLE "usuarios_SAAS_Agentes"
ALTER COLUMN "anon_key_token" SET DEFAULT gen_random_uuid();
