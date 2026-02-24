-- Roadmap: itens (oficiais + sugestões) e votos por domínio do app do cliente

CREATE TABLE IF NOT EXISTS public.roadmap_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'sugestao' CHECK (status IN ('sugestao', 'planejado', 'em_andamento', 'concluido')),
  votos_count INTEGER NOT NULL DEFAULT 0,
  dominio_sugestao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roadmap_votos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.roadmap_itens(id) ON DELETE CASCADE,
  dominio TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, dominio)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_itens_status ON public.roadmap_itens(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_itens_created_at ON public.roadmap_itens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roadmap_votos_item_id ON public.roadmap_votos(item_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_votos_dominio ON public.roadmap_votos(dominio);

-- Trigger: manter votos_count atualizado
CREATE OR REPLACE FUNCTION public.roadmap_update_votos_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.roadmap_itens SET votos_count = votos_count + 1 WHERE id = NEW.item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.roadmap_itens SET votos_count = GREATEST(0, votos_count - 1) WHERE id = OLD.item_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_roadmap_votos_count ON public.roadmap_votos;
CREATE TRIGGER trg_roadmap_votos_count
  AFTER INSERT OR DELETE ON public.roadmap_votos
  FOR EACH ROW EXECUTE FUNCTION public.roadmap_update_votos_count();

-- RLS
ALTER TABLE public.roadmap_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_votos ENABLE ROW LEVEL SECURITY;

-- roadmap_itens: leitura pública; anon pode inserir só sugestões; autenticado pode tudo
CREATE POLICY "Qualquer um pode ler itens do roadmap"
  ON public.roadmap_itens FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anon pode inserir sugestão"
  ON public.roadmap_itens FOR INSERT TO anon WITH CHECK (status = 'sugestao');

CREATE POLICY "Autenticado pode inserir/atualizar/excluir itens"
  ON public.roadmap_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- roadmap_votos: leitura pública; anon e authenticated podem inserir (um voto por domínio por item)
CREATE POLICY "Qualquer um pode ler votos"
  ON public.roadmap_votos FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Qualquer um pode inserir voto (com domínio)"
  ON public.roadmap_votos FOR INSERT TO anon, authenticated WITH CHECK (true);
