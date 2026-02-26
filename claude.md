# Admin-HubLabel – Referência para o Claude

Use este arquivo para consultar esquemas e convenções do projeto e evitar erros de nomes de colunas.

---

## Aparência padrão do sistema

- **Cor primária:** `#ffd323` (HSL: `47 100% 54%`). No CSS: `--primary: 47 100% 54%` (Tailwind usa `hsl(var(--primary))`).
- **Logo (sidebar, emails, login, changelog):**  
  `https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/LOGO.png`
- **Favicon (sidebar recolhida):**  
  `https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/FAVICON.png`

Usar esses valores em emails (backend), Sidebar, Login, Changelog público e InserirAnonKey quando não houver logo/favicon do cliente.

---

## Convenção de colunas

- **Sempre use os nomes exatos das colunas** como estão no banco. Não assuma snake_case para tabelas que usam camelCase.
- Ao fazer `select()`, `update()` ou referências no código, use exatamente o nome da coluna do schema abaixo.

---

## Tabela `public."versoes_SAAS_Agentes"`

Colunas **todas em camelCase** (com aspas no PostgreSQL):

| Coluna             | Tipo      |
|--------------------|-----------|
| id                 | bigint    |
| created_at         | timestamptz |
| nomeVersao         | text      |
| linkVersao         | text      |
| correcoes          | text      |
| implementacoes     | text      |
| titulo             | text      |
| url_imagem         | text      |
| atualizou_todos    | boolean   |

**No código:** use `nomeVersao`, `linkVersao` (não `nome_versao`, `link_versao`).

---

## Tabela `public."usuarios_SAAS_Agentes"`

Mix de **camelCase** (campos de app) e **snake_case** (Supabase/auth):

**CamelCase (com aspas no schema):**  
`nomeSoftware`, `corPrincipal`, `corSecundaria`, `urlEvolution`, `apiEvolution`, `idCredSupabase`, `idCredRedis`, `idCredPostgres`, `n8nUrl`, `n8nApikey`, `idWorkflown8n`, `idCredMinio`, `urlLogo`, `urlFavicon`, `telefoneSuporte`, `idCredAdmin`, `urlMinio`, `acessoAtualizacao`, `codigoAcesso`, `idCredN8N`

**Snake_case:**  
`created_at`, `dominio`, `email`, `senha`, `versao`, `supabase_url`, `supabase_apikey`, `supabase_anon_key`, `anon_key_token`, `atualizacoes_automaticas`

**No código:** use `nomeSoftware` (não `nome_software`); para anon key e auth use `supabase_anon_key`, `anon_key_token`, `atualizacoes_automaticas`.

---

## Backend – exclusão de atualização

- Endpoint: `POST /api/excluir-atualizacao` (body: `{ versionId: number }`).
- Busca a versão com `.select("id, linkVersao")`, remove o arquivo no Storage (parse da URL pública) e depois deleta o registro.
- A coluna do link é `linkVersao`.

---

## Demais tabelas (migrations)

### `public.atualizacao_todos_logs`
Logs do fluxo "Atualizar todos".  
Colunas: `id` (uuid), `versao_id` (bigint FK → versoes_SAAS_Agentes), `cliente_id` (uuid FK → usuarios_SAAS_Agentes), `status_atualizacao` ('sucesso'|'erro'), `mensagem_atualizacao`, `status_email` ('pendente'|'sucesso'|'erro'), `mensagem_email`, `resposta_atualizacao` (text), `created_at`.

### `public.emails_agendados`
Emails agendados (cron no backend).  
Colunas: `id`, `scheduled_at`, `destinatarios` (jsonb), `assunto`, `corpo`, `status` ('pending'|'sent'|'failed'|'cancelled'), `created_at`, `sent_at`, `error_message`.

### `public.instalacoes`
Kanban de instalações.  
Colunas: `id`, `telefone`, `dominio`, `acessos`, `status` ('aguardando'|'em_andamento'|'finalizado'), `coletar_acessos` (boolean), `arquivos` (jsonb, array de `{ name, url }`), `prioridade` ('urgente'|'normal'), `created_at`.

### `public.modelos_email`
Modelos de email reutilizáveis.  
Colunas: `id`, `nome`, `assunto`, `corpo`, `created_at`.

### `public.vendas`
Vendas realizadas.  
Colunas: `id`, `valor`, `vendedor`, `data_venda`, `percentual_taxa_checkout`, `status` ('ativa'|'reembolsada'), `created_at`.

### `public.vendedores`
Cadastro de vendedores.  
Colunas: `id`, `nome` (unique).

### `public.roadmap_itens`
Itens do roadmap (oficiais + sugestões).  
Colunas: `id`, `titulo`, `descricao`, `status` ('sugestao'|'planejado'|'em_andamento'|'concluido'), `votos_count`, `dominio_sugestao`, `created_at`.

### `public.roadmap_votos`
Votos por domínio por item.  
Colunas: `id`, `item_id` (FK → roadmap_itens), `dominio`, `created_at`. UNIQUE(item_id, dominio).

### `public.vendas_a_cobrar`
Contas a receber.  
Colunas: `id`, `valor`, `vendedor`, `data_prevista_cobranca`, `descricao`, `percentual_taxa_checkout`, `created_at`.

---

## Resumo rápido

| Tabela                  | Nome da versão / link | Nome do software |
|-------------------------|------------------------|------------------|
| versoes_SAAS_Agentes    | `nomeVersao`, `linkVersao` | — |
| usuarios_SAAS_Agentes   | —                      | `nomeSoftware`   |
