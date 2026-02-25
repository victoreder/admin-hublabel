import { useState, useEffect, useCallback } from "react";
import { Plus, GripVertical, Copy, Phone, Globe, Clock } from "lucide-react";
import { format, parseISO, addHours, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { Instalacao, StatusInstalacao } from "@/types/database";
import { gerarTextoAcessos } from "@/lib/instalacaoAcessos";
import { cn, getBackendUrl } from "@/lib/utils";

const STATUS_ORDER: StatusInstalacao[] = ["aguardando", "em_andamento", "finalizado"];
const STATUS_LABEL: Record<StatusInstalacao, string> = {
  aguardando: "Aguardando",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
};

const COLUMN_BASE = "bg-card border border-border rounded-xl flex flex-col min-h-[380px] shadow-sm";
const COLUMN_ACCENT: Record<StatusInstalacao, string> = {
  aguardando: "border-t-4 border-t-amber-500",
  em_andamento: "border-t-4 border-t-blue-500",
  finalizado: "border-t-4 border-t-emerald-500",
};
const COLUMN_HEADER_ACCENT: Record<StatusInstalacao, string> = {
  aguardando: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  em_andamento: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  finalizado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
};

const DRAG_TYPE = "application/x-instalacao-id";
const PRAZO_ENTREGA_HORAS = 24;

function formatDataCriacao(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  try {
    return format(parseISO(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

function getHorasParaEntregar(createdAt: string | undefined): { texto: string; tipo: "verde" | "amarelo" | "vermelho" } {
  if (!createdAt) return { texto: "—", tipo: "vermelho" };
  const criado = parseISO(createdAt);
  const limite = addHours(criado, PRAZO_ENTREGA_HORAS);
  const agora = new Date();
  const horasRestantes = differenceInHours(limite, agora);
  if (horasRestantes <= 0) return { texto: "Atrasado", tipo: "vermelho" };
  if (horasRestantes > 12) return { texto: `Faltam ${horasRestantes}h para entregar`, tipo: "verde" };
  if (horasRestantes > 6) return { texto: `Faltam ${horasRestantes}h para entregar`, tipo: "amarelo" };
  return { texto: `Faltam ${horasRestantes}h para entregar`, tipo: "vermelho" };
}

export function InstalacoesAdmin() {
  const [instalacoes, setInstalacoes] = useState<Instalacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragStatus, setDragStatus] = useState<StatusInstalacao | null>(null);

  const fetchInstalacoes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("instalacoes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInstalacoes((data as Instalacao[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar instalações";
      toast.error(msg);
      setInstalacoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstalacoes();
  }, [fetchInstalacoes]);

  const handleCreate = async (payload: { telefone?: string; dominio: string; acessos?: string }) => {
    try {
      const { error } = await supabase.from("instalacoes").insert({
        telefone: payload.telefone || null,
        dominio: payload.dominio.trim(),
        acessos: payload.acessos || null,
        status: "aguardando",
      });
      if (error) throw error;
      setModalOpen(false);
      fetchInstalacoes();
      toast.success("Instalação criada.");
      const backendUrl = getBackendUrl();
      if (backendUrl) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${backendUrl}/api/email-nova-instalacao`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
            },
            body: JSON.stringify({
              telefone: payload.telefone || undefined,
              dominio: payload.dominio.trim(),
            }),
          });
          if (!res.ok) toast.error("Instalação criada, mas falha ao enviar email de notificação.");
        } catch {
          toast.error("Instalação criada, mas falha ao enviar email de notificação.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar";
      toast.error(msg);
    }
  };

  const handleStatusChange = useCallback(
    async (id: string, newStatus: StatusInstalacao) => {
      const instalacao = instalacoes.find((i) => i.id === id);
      try {
        const { error } = await supabase
          .from("instalacoes")
          .update({ status: newStatus })
          .eq("id", id);
        if (error) throw error;
        setInstalacoes((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
        );
        toast.success(`Movido para ${STATUS_LABEL[newStatus]}`);
        if (newStatus === "finalizado" && instalacao && getBackendUrl()) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${getBackendUrl()}/api/email-instalacao-finalizada`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
              },
              body: JSON.stringify({
                telefone: instalacao.telefone || undefined,
                dominio: instalacao.dominio,
              }),
            });
            if (!res.ok) toast.error("Status atualizado, mas falha ao enviar email de finalização.");
          } catch {
            toast.error("Status atualizado, mas falha ao enviar email de finalização.");
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao atualizar";
        toast.error(msg);
      }
    },
    [instalacoes]
  );

  const handleDrop = useCallback(
    (targetStatus: StatusInstalacao) => {
      if (!dragId) return;
      if (dragStatus === targetStatus) {
        setDragId(null);
        setDragStatus(null);
        return;
      }
      handleStatusChange(dragId, targetStatus);
      setDragId(null);
      setDragStatus(null);
    },
    [dragId, dragStatus, handleStatusChange]
  );

  const handleCopyAcessos = useCallback((instalacao: Instalacao) => {
    const texto = gerarTextoAcessos(instalacao.dominio);
    navigator.clipboard.writeText(texto).then(
      () => toast.success("Acessos copiados!"),
      () => toast.error("Falha ao copiar.")
    );
  }, []);

  const byStatus = (status: StatusInstalacao) =>
    instalacoes.filter((i) => i.status === status);

  if (loading && instalacoes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Instalações</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova instalação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[420px]">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            label={STATUS_LABEL[status]}
            count={byStatus(status).length}
            cards={byStatus(status)}
            dragId={dragId}
            onDragStart={(id) => {
              setDragId(id);
              setDragStatus(status);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDragStatus(null);
            }}
            onDrop={() => handleDrop(status)}
            onCopy={handleCopyAcessos}
          />
        ))}
      </div>

      <NewInstalacaoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}

interface KanbanColumnProps {
  status: StatusInstalacao;
  label: string;
  count: number;
  cards: Instalacao[];
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onCopy: (instalacao: Instalacao) => void;
}

function KanbanColumn({
  status,
  label,
  count,
  cards,
  dragId,
  onDragStart,
  onDragEnd,
  onDrop,
  onCopy,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDrop();
  };

  return (
    <div
      className={cn(
        COLUMN_BASE,
        COLUMN_ACCENT[status],
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "p-3 border-b flex items-center justify-between rounded-t-xl",
          COLUMN_HEADER_ACCENT[status]
        )}
      >
        <span className="font-semibold">{label}</span>
        <span className="text-sm opacity-80 tabular-nums">{count}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {cards.map((instalacao) => (
          <KanbanCard
            key={instalacao.id}
            instalacao={instalacao}
            isDragging={dragId === instalacao.id}
            onDragStart={() => onDragStart(instalacao.id)}
            onDragEnd={onDragEnd}
            onCopy={onCopy}
          />
        ))}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  instalacao: Instalacao;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onCopy: (instalacao: Instalacao) => void;
}

function KanbanCard({ instalacao, isDragging, onDragStart, onDragEnd, onCopy }: KanbanCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, instalacao.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  };

  const isFinalizado = instalacao.status === "finalizado";
  const dataCriacao = formatDataCriacao(instalacao.created_at);
  const prazo = isFinalizado
    ? { texto: "Entregue", tipo: "entregue" as const }
    : getHorasParaEntregar(instalacao.created_at);

  const tagClasses: Record<"verde" | "amarelo" | "vermelho" | "entregue", string> = {
    verde: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
    amarelo: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 dark:border-amber-700",
    vermelho: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700",
    entregue: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
  };

  return (
    <Card
      className={cn(
        "bg-card shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50 shadow-lg scale-[0.98]"
      )}
    >
      <CardContent className="p-3 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            className="flex min-w-0 flex-1 cursor-grab active:cursor-grabbing items-start gap-2"
          >
            <div className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground">
              <GripVertical className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-medium text-foreground truncate">
                <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {instalacao.dominio || "—"}
              </div>
              {instalacao.telefone && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {instalacao.telefone}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3 shrink-0" />
                {dataCriacao}
              </div>
            </div>
          </div>
          {isFinalizado && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={() => onCopy(instalacao)}
              title="Copiar acessos"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 w-fit rounded-md border px-2 py-0.5 text-xs font-medium",
            tagClasses[prazo.tipo]
          )}
        >
          {prazo.texto}
        </span>
      </CardContent>
    </Card>
  );
}

interface NewInstalacaoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { telefone?: string; dominio: string; acessos?: string }) => void;
}

function NewInstalacaoModal({ open, onClose, onSubmit }: NewInstalacaoModalProps) {
  const [telefone, setTelefone] = useState("");
  const [dominio, setDominio] = useState("");
  const [acessos, setAcessos] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTelefone("");
    setDominio("");
    setAcessos("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = dominio.trim();
    if (!d) {
      toast.error("Informe o domínio.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ telefone: telefone.trim() || undefined, dominio: d, acessos: acessos.trim() || undefined });
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova instalação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dominio">Domínio *</Label>
            <Input
              id="dominio"
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
              placeholder="exemplo.com.br"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acessos">Acessos</Label>
            <Textarea
              id="acessos"
              value={acessos}
              onChange={(e) => setAcessos(e.target.value)}
              placeholder="Cole ou descreva todos os acessos aqui..."
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
