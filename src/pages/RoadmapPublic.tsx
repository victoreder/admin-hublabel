import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ThumbsUp, Lightbulb, Send } from "lucide-react";
import type { RoadmapItem, RoadmapStatus } from "@/types/database";

const STORAGE_DOMINIO = "roadmap_dominio";
const LOGO_URL =
  "https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/LOGO.png";

const STATUS_LABEL: Record<RoadmapStatus, string> = {
  sugestao: "Sugestões",
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

function getStoredDominio(): string | null {
  try {
    return localStorage.getItem(STORAGE_DOMINIO);
  } catch {
    return null;
  }
}

function setStoredDominio(dominio: string) {
  try {
    localStorage.setItem(STORAGE_DOMINIO, dominio.trim().toLowerCase());
  } catch {
    // ignore
  }
}

export function RoadmapPublic() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [voteDominio, setVoteDominio] = useState("");
  const [pendingVoteItemId, setPendingVoteItemId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [suggestTitulo, setSuggestTitulo] = useState("");
  const [suggestDescricao, setSuggestDescricao] = useState("");
  const [suggestDominio, setSuggestDominio] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("roadmap_itens")
      .select("*")
      .order("votos_count", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error) setItems((data as RoadmapItem[]) ?? []);
  }, []);

  const fetchMyVotes = useCallback(async (dominio: string) => {
    const { data } = await supabase
      .from("roadmap_votos")
      .select("item_id")
      .eq("dominio", dominio.trim().toLowerCase());
    const ids = new Set((data ?? []).map((r) => r.item_id));
    setVotedIds(ids);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchItems();
      const dominio = getStoredDominio();
      if (dominio) await fetchMyVotes(dominio);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchItems, fetchMyVotes]);

  const openVoteDialog = (itemId: string) => {
    setPendingVoteItemId(itemId);
    setVoteDominio(getStoredDominio() ?? "");
    setVoteDialogOpen(true);
  };

  const submitVote = async () => {
    const dominio = voteDominio.trim().toLowerCase();
    if (!dominio) {
      toast.error("Informe o domínio do app do cliente.");
      return;
    }
    if (!pendingVoteItemId) return;
    setVoting(true);
    const { error } = await supabase.from("roadmap_votos").insert({
      item_id: pendingVoteItemId,
      dominio,
    });
    setVoting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Este domínio já votou neste item.");
      } else {
        toast.error(error.message || "Erro ao registrar voto.");
      }
      return;
    }
    setStoredDominio(dominio);
    setVotedIds((prev) => new Set(prev).add(pendingVoteItemId));
    await fetchItems();
    setVoteDialogOpen(false);
    setPendingVoteItemId(null);
    setVoteDominio("");
    toast.success("Voto registrado!");
  };

  const submitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const titulo = suggestTitulo.trim();
    if (!titulo) {
      toast.error("Informe o título da sugestão.");
      return;
    }
    setSuggesting(true);
    const { error } = await supabase.from("roadmap_itens").insert({
      titulo,
      descricao: suggestDescricao.trim() || null,
      status: "sugestao",
      dominio_sugestao: suggestDominio.trim() || null,
    });
    setSuggesting(false);
    if (error) {
      toast.error(error.message || "Erro ao enviar sugestão.");
      return;
    }
    setSuggestTitulo("");
    setSuggestDescricao("");
    setSuggestDominio("");
    await fetchItems();
    toast.success("Sugestão enviada! Obrigado.");
  };

  const byStatus = (status: RoadmapStatus) =>
    items.filter((i) => i.status === status);

  return (
    <div
      className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
      data-roadmap-light
    >
      <header className="border-b border-[hsl(var(--border))] py-8 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="container max-w-2xl mx-auto px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-4 mb-6">
            <img src={LOGO_URL} alt="Logo" className="h-9 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Roadmap
          </h1>
          <p className="mt-1 text-[15px] text-[hsl(var(--muted-foreground))]">
            Vote nas próximas atualizações e envie sugestões. Informe o domínio do app do cliente para votar.
          </p>
          <div className="mt-6 h-px w-full bg-[hsl(var(--border))]" aria-hidden />
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-10 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {(
              [
                "sugestao",
                "planejado",
                "em_andamento",
                "concluido",
              ] as RoadmapStatus[]
            ).map((status) => {
              const list = byStatus(status);
              if (list.length === 0) return null;
              return (
                <section key={status}>
                  <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
                    {STATUS_LABEL[status]}
                  </h2>
                  <ul className="space-y-4">
                    {list.map((item) => (
                      <Card key={item.id}>
                        <CardHeader className="pb-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <CardTitle className="text-base">{item.titulo}</CardTitle>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                {item.votos_count} {item.votos_count === 1 ? "voto" : "votos"}
                              </span>
                              {status === "sugestao" || status === "planejado" || status === "em_andamento" ? (
                                votedIds.has(item.id) ? (
                                  <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                    <ThumbsUp className="h-3.5 w-3.5" /> Já votei
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="min-h-8"
                                    onClick={() => openVoteDialog(item.id)}
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                                    Votar
                                  </Button>
                                )
                              ) : null}
                            </div>
                          </div>
                          {item.dominio_sugestao && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              Sugerido por {item.dominio_sugestao}
                            </p>
                          )}
                        </CardHeader>
                        {item.descricao && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">
                              {item.descricao}
                            </p>
                            {item.created_at && (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                                {format(new Date(item.created_at), "d 'de' MMM 'de' yyyy", {
                                  locale: ptBR,
                                })}
                              </p>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </ul>
                </section>
              );
            })}

            {items.length === 0 && (
              <p className="text-center py-8 text-[15px] text-[hsl(var(--muted-foreground))]">
                Nenhum item no roadmap ainda. Envie a primeira sugestão abaixo.
              </p>
            )}

            <section className="border-t border-[hsl(var(--border))] pt-10">
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Sugerir atualização
              </h2>
              <form onSubmit={submitSuggestion} className="space-y-4">
                <div>
                  <Label htmlFor="suggest-titulo">Título *</Label>
                  <Input
                    id="suggest-titulo"
                    value={suggestTitulo}
                    onChange={(e) => setSuggestTitulo(e.target.value)}
                    placeholder="Ex.: Relatório em PDF"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="suggest-descricao">Descrição (opcional)</Label>
                  <textarea
                    id="suggest-descricao"
                    value={suggestDescricao}
                    onChange={(e) => setSuggestDescricao(e.target.value)}
                    placeholder="Descreva brevemente a sugestão..."
                    rows={3}
                    className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <Label htmlFor="suggest-dominio">Domínio do app do cliente (opcional)</Label>
                  <Input
                    id="suggest-dominio"
                    value={suggestDominio}
                    onChange={(e) => setSuggestDominio(e.target.value)}
                    placeholder="exemplo.seudominio.com.br"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={suggesting}>
                  <Send className="h-4 w-4 mr-2" />
                  {suggesting ? "Enviando..." : "Enviar sugestão"}
                </Button>
              </form>
            </section>
          </div>
        )}
      </main>

      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Domínio do app do cliente</DialogTitle>
            <DialogDescription>
              Informe o domínio do app do seu cliente para registrar seu voto (um voto por domínio por item).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="vote-dominio">Domínio</Label>
            <Input
              id="vote-dominio"
              value={voteDominio}
              onChange={(e) => setVoteDominio(e.target.value)}
              placeholder="exemplo.seudominio.com.br"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVoteDialogOpen(false);
                setPendingVoteItemId(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={submitVote} disabled={voting || !voteDominio.trim()}>
              {voting ? "Registrando..." : "Votar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
