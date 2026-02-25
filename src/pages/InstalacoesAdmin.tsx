import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, GripVertical, Copy, Phone, Globe, Clock, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { format, parseISO, addHours, differenceInHours, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
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
import type { Instalacao, StatusInstalacao, PrioridadeInstalacao } from "@/types/database";
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

const PRIORIDADE_LABEL: Record<PrioridadeInstalacao, string> = {
  urgente: "Urgente",
  normal: "Normal",
};

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

function getDefaultDateRange(days: number): { dateFrom: Date; dateTo: Date } {
  const dateTo = endOfDay(new Date());
  const dateFrom = startOfDay(subDays(dateTo, days - 1));
  return { dateFrom, dateTo };
}

export function InstalacoesAdmin() {
  const [instalacoes, setInstalacoes] = useState<Instalacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInstalacao, setSelectedInstalacao] = useState<Instalacao | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragStatus, setDragStatus] = useState<StatusInstalacao | null>(null);
  const [dateFrom, setDateFrom] = useState<Date>(() => getDefaultDateRange(7).dateFrom);
  const [dateTo, setDateTo] = useState<Date>(() => getDefaultDateRange(7).dateTo);

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

  const handleCreate = async (payload: { telefone?: string; dominio: string; acessos?: string; prioridade?: PrioridadeInstalacao }) => {
    try {
      const { error } = await supabase.from("instalacoes").insert({
        telefone: payload.telefone || null,
        dominio: payload.dominio.trim(),
        acessos: payload.acessos || null,
        status: "aguardando",
        prioridade: payload.prioridade || "normal",
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

  const handleUpdateInstalacao = useCallback(
    async (id: string, data: { telefone?: string; dominio: string; acessos?: string; prioridade?: PrioridadeInstalacao; status?: StatusInstalacao }) => {
      try {
        const payload = {
          telefone: data.telefone ?? null,
          dominio: data.dominio.trim(),
          acessos: data.acessos ?? null,
          prioridade: data.prioridade ?? "normal",
          ...(data.status != null && { status: data.status }),
        };
        const { error } = await supabase.from("instalacoes").update(payload).eq("id", id);
        if (error) throw error;
        setInstalacoes((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, ...payload, status: data.status ?? i.status }
              : i
          )
        );
        setSelectedInstalacao((prev) =>
          prev?.id === id
            ? { ...prev, ...payload, status: data.status ?? prev.status }
            : prev
        );
        toast.success("Instalação atualizada.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao atualizar";
        toast.error(msg);
      }
    },
    []
  );

  const handleDeleteInstalacao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("instalacoes").delete().eq("id", id);
      if (error) throw error;
      setInstalacoes((prev) => prev.filter((i) => i.id !== id));
      setSelectedInstalacao(null);
      toast.success("Instalação excluída.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir";
      toast.error(msg);
    }
  }, []);

  const filteredInstalacoes = useMemo(() => {
    return instalacoes.filter((i) => {
      if (!i.created_at) return true;
      const d = parseISO(i.created_at);
      return isWithinInterval(d, { start: dateFrom, end: dateTo });
    });
  }, [instalacoes, dateFrom, dateTo]);

  const byStatus = (status: StatusInstalacao) =>
    filteredInstalacoes.filter((i) => i.status === status);

  const setPresetDays = (days: number) => {
    const { dateFrom: from, dateTo: to } = getDefaultDateRange(days);
    setDateFrom(from);
    setDateTo(to);
  };

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

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Período:</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPresetDays(7)}
        >
          7 dias
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPresetDays(30)}
        >
          30 dias
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={format(dateFrom, "yyyy-MM-dd")}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setDateFrom(startOfDay(parseISO(v)));
            }}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          />
          <span className="text-muted-foreground">até</span>
          <input
            type="date"
            value={format(dateTo, "yyyy-MM-dd")}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setDateTo(endOfDay(parseISO(v)));
            }}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          />
        </div>
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
            onCardClick={setSelectedInstalacao}
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
      <InstalacaoDetailModal
        instalacao={selectedInstalacao}
        open={!!selectedInstalacao}
        onClose={() => setSelectedInstalacao(null)}
        onCopy={handleCopyAcessos}
        onUpdate={handleUpdateInstalacao}
        onDelete={handleDeleteInstalacao}
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
  onCardClick: (instalacao: Instalacao) => void;
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
  onCardClick,
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
            onCardClick={() => onCardClick(instalacao)}
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
  onCardClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onCopy: (instalacao: Instalacao) => void;
}

function KanbanCard({ instalacao, isDragging, onCardClick, onDragStart, onDragEnd, onCopy }: KanbanCardProps) {
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
            className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </div>
          <button
            type="button"
            onClick={onCardClick}
            className="min-w-0 flex-1 text-left rounded-md hover:bg-accent/50 transition-colors -m-1 p-1"
          >
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {dataCriacao}
              </span>
              {instalacao.prioridade === "urgente" && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-400/60 bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Urgente
                </span>
              )}
            </div>
          </button>
          {isFinalizado && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(instalacao);
              }}
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

interface InstalacaoDetailModalProps {
  instalacao: Instalacao | null;
  open: boolean;
  onClose: () => void;
  onCopy: (instalacao: Instalacao) => void;
  onUpdate: (id: string, data: { telefone?: string; dominio: string; acessos?: string; prioridade?: PrioridadeInstalacao; status?: StatusInstalacao }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function InstalacaoDetailModal({ instalacao, open, onClose, onCopy, onUpdate, onDelete }: InstalacaoDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [dominio, setDominio] = useState("");
  const [acessos, setAcessos] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeInstalacao>("normal");
  const [status, setStatus] = useState<StatusInstalacao>("aguardando");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (instalacao) {
      setTelefone(instalacao.telefone ?? "");
      setDominio(instalacao.dominio ?? "");
      setAcessos(instalacao.acessos ?? "");
      setPrioridade((instalacao.prioridade as PrioridadeInstalacao) ?? "normal");
      setStatus(instalacao.status);
      setEditing(false);
    }
  }, [instalacao]);

  if (!instalacao) return null;
  const dataCriacao = formatDataCriacao(instalacao.created_at);
  const isFinalizado = instalacao.status === "finalizado";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = dominio.trim();
    if (!d) {
      toast.error("Informe o domínio.");
      return;
    }
    setSubmitting(true);
    try {
      await onUpdate(instalacao.id, {
        telefone: telefone.trim() || undefined,
        dominio: d,
        acessos: acessos.trim() || undefined,
        prioridade,
        status,
      });
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    if (window.confirm("Tem certeza que deseja excluir esta instalação?")) {
      onDelete(instalacao.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (setEditing(false), onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            {editing ? "Editar instalação" : instalacao.dominio || "Instalação"}
          </DialogTitle>
        </DialogHeader>
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="detail-telefone">Telefone</Label>
              <Input
                id="detail-telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-dominio">Domínio *</Label>
              <Input
                id="detail-dominio"
                value={dominio}
                onChange={(e) => setDominio(e.target.value)}
                placeholder="exemplo.com.br"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-status">Status</Label>
              <select
                id="detail-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusInstalacao)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-prioridade">Prioridade</Label>
              <select
                id="detail-prioridade"
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as PrioridadeInstalacao)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-acessos">Acessos</Label>
              <Textarea
                id="detail-acessos"
                value={acessos}
                onChange={(e) => setAcessos(e.target.value)}
                placeholder="Cole ou descreva todos os acessos..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteClick}
                className="sm:mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium">{STATUS_LABEL[instalacao.status]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Prioridade</span>
                <p className="font-medium flex items-center gap-1">
                  {instalacao.prioridade === "urgente" && (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  {PRIORIDADE_LABEL[instalacao.prioridade ?? "normal"]}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone</span>
                <p className="font-medium">{instalacao.telefone || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Criado em</span>
                <p className="font-medium">{dataCriacao}</p>
              </div>
            </div>
            {instalacao.acessos && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Acessos</span>
                <pre className="text-sm bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                  {instalacao.acessos}
                </pre>
              </div>
            )}
            {isFinalizado && (
              <Button onClick={() => onCopy(instalacao)} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copiar texto de acessos
              </Button>
            )}
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface NewInstalacaoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { telefone?: string; dominio: string; acessos?: string; prioridade?: PrioridadeInstalacao }) => void;
}

function NewInstalacaoModal({ open, onClose, onSubmit }: NewInstalacaoModalProps) {
  const [telefone, setTelefone] = useState("");
  const [dominio, setDominio] = useState("");
  const [acessos, setAcessos] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeInstalacao>("normal");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTelefone("");
    setDominio("");
    setAcessos("");
    setPrioridade("normal");
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
      await onSubmit({
        telefone: telefone.trim() || undefined,
        dominio: d,
        acessos: acessos.trim() || undefined,
        prioridade,
      });
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
            <Label htmlFor="prioridade">Prioridade</Label>
            <select
              id="prioridade"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as PrioridadeInstalacao)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
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
