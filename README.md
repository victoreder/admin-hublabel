# HubLabel Admin

Sistema de administração HubLabel com Supabase (Auth + PostgreSQL). Envio de emails e notificação de clientes via Backend próprio (Brevo SMTP).

## Stack

- **Frontend:** React + TypeScript + Vite + shadcn/ui
- **Auth e DB:** Supabase
- **Backend:** Node.js + Express (emails via Brevo SMTP)

## Setup

### Frontend

1. Instale as dependências:

```bash
npm install
```

2. Copie o arquivo de exemplo e configure as variáveis:

```bash
cp .env.example .env
```

Edite `.env`:

```
VITE_SUPABASE_URL=https://xnfmuxuvnkhwoymxgmbw.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
VITE_BACKEND_URL=http://localhost:3333
```

3. Execute as migrations no Supabase (SQL Editor). Ver arquivos em `migrations/` (001 e 002). A 002 cria as tabelas `modelos_email` e `vendas`, e o bucket Storage `versoes` deve existir para upload de arquivos em Nova atualização.

4. Rode o projeto:

```bash
npm run dev
```

### Backend (envio de emails via Brevo SMTP)

1. Entre na pasta do backend e instale as dependências:

```bash
cd backend
npm install
```

2. Crie o arquivo de ambiente a partir do exemplo:

```bash
cp .env.example .env
```

3. Edite `backend/.env` com as credenciais Brevo:

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=seu_login@smtp-brevo.com
SMTP_KEY=sua_chave_smtp_brevo
SMTP_FROM_EMAIL=naoresponda@hublabel.com.br
SMTP_FROM_NAME=HubLabel
PORT=3333
```

4. Inicie o backend:

```bash
npm run dev
```

O endpoint `POST /api/enviar-email` aceita JSON: `{ "destinatarios": ["email@..."], "assunto": "...", "corpo": "..." }`. O frontend já chama esse endpoint quando você envia emails pela tela de Emails.

5. Configure o Database Webhook no Supabase para a tabela `versoes_SAAS_Agentes` (evento INSERT), apontando para o endpoint do seu Backend.

## Deploy na Vercel (frontend + API)

O projeto inclui funções serverless em `api/` que rodam na Vercel junto com o frontend. Configure em **Settings → Environment Variables**:

**Frontend (todas as envs):**
- `VITE_SUPABASE_URL` – URL do Supabase
- `VITE_SUPABASE_ANON_KEY` – Anon key pública
- `VITE_BACKEND_URL` – URL do deploy (ex: `https://seu-projeto.vercel.app`)
- `VITE_SALES_ALLOWED_USER_ID` (opcional)

**API (backend serverless):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_KEY`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` – Brevo
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` – Supabase
- `N8N_URL`, `N8N_WORKFLOW_ID`, `N8N_API_KEY` (opcional, para Nova atualização)

## Scripts

- `npm run dev` - Desenvolvimento
- `npm run build` - Build de produção
- `npm run preview` - Preview do build
