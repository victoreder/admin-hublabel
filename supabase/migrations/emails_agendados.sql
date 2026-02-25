-- Tabela para agendamento de envio de emails (cron no backend processa pendentes).
-- Rode no SQL Editor do Supabase ou via supabase db push.

CREATE TABLE IF NOT EXISTS public.emails_agendados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at timestamptz NOT NULL,
  destinatarios jsonb NOT NULL,
  assunto text NOT NULL,
  corpo text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_message text
);

COMMENT ON TABLE public.emails_agendados IS 'Emails agendados; o backend envia na data/hora programada. destinatarios: array de { email, nomeSoftware?, dominio?, versao?, anon_key_token? } para substituição de variáveis.';

CREATE INDEX IF NOT EXISTS idx_emails_agendados_scheduled_status
  ON public.emails_agendados (scheduled_at, status)
  WHERE status = 'pending';
