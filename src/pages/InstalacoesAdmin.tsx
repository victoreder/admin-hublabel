import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, GripVertical, Copy, Phone, Globe, Clock, AlertCircle, Pencil, Trash2, Upload, X, Download } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { Instalacao, StatusInstalacao, PrioridadeInstalacao, InstalacaoArquivo } from "@/types/database";
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
const BUCKET_INSTALACOES = "versoes";

/** Extrai bucket e path de uma URL do Supabase Storage (object/public). */
function parseStorageUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const bucket = match[1];
  const path = decodeURIComponent(match[2]);
  return bucket && path ? { bucket, path } : null;
}

const PRIORIDADE_LABEL: Record<PrioridadeInstalacao, string> = {
  urgente: "Urgente",
  normal: "Normal",
};

/** Formata telefone: (DDD) XXXX-XXXX até 10 dígitos; (DDD) XXXXX-XXXX com 11 dígitos */
function formatTelefone(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

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
        .order("created_at", { ascending: true });
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

  const handleCreate = async (payload: { telefone?: string; dominio?: string; acessos?: string; prioridade?: PrioridadeInstalacao; coletar_acessos?: boolean; arquivos?: InstalacaoArquivo[] }) => {
    try {
      const { error } = await supabase.from("instalacoes").insert({
        telefone: payload.telefone || null,
        dominio: (payload.dominio ?? "").trim() || "",
        acessos: payload.acessos || null,
        status: "aguardando",
        prioridade: payload.prioridade || "normal",
        coletar_acessos: payload.coletar_acessos ?? false,
        arquivos: payload.arquivos ?? [],
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
              dominio: (payload.dominio ?? "").trim() || undefined,
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
      const tirarColetarAcessos = newStatus === "em_andamento" && instalacao?.coletar_acessos;
      const payload: { status: StatusInstalacao; coletar_acessos?: boolean } = { status: newStatus };
      if (tirarColetarAcessos) payload.coletar_acessos = false;
      try {
        const { error } = await supabase
          .from("instalacoes")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        setInstalacoes((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, status: newStatus, ...(tirarColetarAcessos && { coletar_acessos: false }) } : i
          )
        );
        if (tirarColetarAcessos) {
          setSelectedInstalacao((prev) =>
            prev?.id === id ? { ...prev, status: newStatus, coletar_acessos: false } : prev
          );
        }
        toast.success(`Movido para ${STATUS_LABEL[newStatus]}`);
        if (newStatus === "finalizado" && instalacao?.arquivos?.length) {
          const pathsToRemove: { bucket: string; path: string }[] = [];
          for (const arq of instalacao.arquivos) {
            const ref = parseStorageUrl(arq.url);
            if (ref) pathsToRemove.push(ref);
          }
          if (pathsToRemove.length > 0) {
            for (const { bucket, path } of pathsToRemove) {
              const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
              if (storageError) console.warn("Storage: arquivo não removido:", path, storageError.message);
            }
          }
        }
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
    async (id: string, data: { telefone?: string; dominio?: string; acessos?: string; prioridade?: PrioridadeInstalacao; status?: StatusInstalacao; coletar_acessos?: boolean; arquivos?: InstalacaoArquivo[] }) => {
      try {
        const payload = {
          telefone: data.telefone ?? null,
          dominio: (data.dominio ?? "").trim() || "",
          acessos: data.acessos ?? null,
          prioridade: data.prioridade ?? "normal",
          ...(data.status != null && { status: data.status }),
          ...(data.coletar_acessos !== undefined && { coletar_acessos: data.coletar_acessos }),
          ...(data.arquivos !== undefined && { arquivos: data.arquivos }),
        };
        const { error } = await supabase.from("instalacoes").update(payload).eq("id", id);
        if (error) throw error;
        setInstalacoes((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, ...payload, status: data.status ?? i.status, coletar_acessos: data.coletar_acessos ?? i.coletar_acessos, arquivos: data.arquivos ?? i.arquivos }
              : i
          )
        );
        setSelectedInstalacao((prev) =>
          prev?.id === id
            ? { ...prev, ...payload, status: data.status ?? prev.status, coletar_acessos: data.coletar_acessos ?? prev.coletar_acessos, arquivos: data.arquivos ?? prev.arquivos }
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

  /** Urgente sempre em cima; dentro de cada grupo, mais antigo em cima (created_at ascendente). */
  const sortCardsForColumn = useCallback((cards: Instalacao[]) => {
    return [...cards].sort((a, b) => {
      const aUrg = a.prioridade === "urgente" ? 1 : 0;
      const bUrg = b.prioridade === "urgente" ? 1 : 0;
      if (bUrg !== aUrg) return bUrg - aUrg;
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tA - tB;
    });
  }, []);

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
            cards={sortCardsForColumn(byStatus(status))}
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
  const columnRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && columnRef.current?.contains(related)) return;
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    onDrop();
  };

  return (
    <div
      ref={columnRef}
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
  const justDraggedRef = useRef(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, instalacao.id);
    e.dataTransfer.setData("text/plain", instalacao.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  };

  const handleDragEnd = () => {
    justDraggedRef.current = true;
    onDragEnd();
  };

  const handleCardClick = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    onCardClick();
  };

  const isFinalizado = instalacao.status === "finalizado";
  const dataCriacao = formatDataCriacao(instalacao.created_at);
  const prazo = isFinalizado
    ? { texto: "Entregue", tipo: "entregue" as const }
    : getHorasParaEntregar(instalacao.created_at);

  const tagClasses: Record<"verde" | "amarelo" | "vermelho" | "entregue", string> = {
    verde: "bg-muted/80 text-muted-foreground border-border",
    amarelo: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 dark:border-amber-700",
    vermelho: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700",
    entregue: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
  };

  return (
    <Card
      className={cn(
        "bg-card shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg scale-[0.98]"
      )}
    >
      <CardContent className="p-3 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleCardClick}
            className="flex min-w-0 flex-1 flex-col gap-2 items-stretch select-none"
          >
            <div className="flex items-start gap-2">
              <div className="shrink-0 mt-0.5 text-muted-foreground">
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
                    {formatTelefone(instalacao.telefone)}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    {dataCriacao}
                  </span>
                  {instalacao.prioridade === "urgente" && (
                    <span className="inline-flex items-center gap-1 rounded border border-red-400/60 bg-red-500/15 px-1.5 py-0.5 text-red-700 dark:text-red-300 font-medium">
                      <AlertCircle className="h-3 w-3" />
                      Urgente
                    </span>
                  )}
                  {instalacao.coletar_acessos && (
                    <span className="inline-flex items-center rounded border border-amber-400/60 bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300 font-medium">
                      Coletar Acessos
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 w-fit rounded-md border px-2 py-0.5 text-xs font-medium",
                tagClasses[prazo.tipo]
              )}
            >
              {prazo.texto}
            </span>
          </div>
          {isFinalizado && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onCopy(instalacao);
              }}
              title="Copiar acessos"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface InstalacaoDetailModalProps {
  instalacao: Instalacao | null;
  open: boolean;
  onClose: () => void;
  onCopy: (instalacao: Instalacao) => void;
  onUpdate: (id: string, data: { telefone?: string; dominio?: string; acessos?: string; prioridade?: PrioridadeInstalacao; status?: StatusInstalacao; coletar_acessos?: boolean; arquivos?: InstalacaoArquivo[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function InstalacaoDetailModal({ instalacao, open, onClose, onCopy, onUpdate, onDelete }: InstalacaoDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [dominio, setDominio] = useState("");
  const [acessos, setAcessos] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeInstalacao>("normal");
  const [status, setStatus] = useState<StatusInstalacao>("aguardando");
  const [coletarAcessos, setColetarAcessos] = useState(false);
  const [arquivosList, setArquivosList] = useState<InstalacaoArquivo[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (instalacao) {
      setTelefone(formatTelefone(instalacao.telefone ?? ""));
      setDominio(instalacao.dominio ?? "");
      setAcessos(instalacao.acessos ?? "");
      setPrioridade((instalacao.prioridade as PrioridadeInstalacao) ?? "normal");
      setStatus(instalacao.status);
      setColetarAcessos(instalacao.coletar_acessos ?? false);
      setArquivosList(instalacao.arquivos ?? []);
      setNewFiles([]);
      setEditing(false);
    }
  }, [instalacao]);

  if (!instalacao) return null;
  const dataCriacao = formatDataCriacao(instalacao.created_at);
  const isFinalizado = instalacao.status === "finalizado";

  const handleDetailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    setNewFiles((prev) => [...prev, ...Array.from(selected)]);
    e.target.value = "";
  };

  const removeArquivo = (index: number) => {
    setArquivosList((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const uploaded: InstalacaoArquivo[] = [];
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `instalacoes/uploads/${Date.now()}-${i}-${safeName}`;
        const { data, error } = await supabase.storage.from(BUCKET_INSTALACOES).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) {
          toast.error(`Falha ao enviar "${file.name}". ${error.message}`);
          setSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage.from(BUCKET_INSTALACOES).getPublicUrl(data.path);
        uploaded.push({ name: file.name, url: urlData.publicUrl });
      }
      const arquivosFinal = [...arquivosList, ...uploaded];
      await onUpdate(instalacao.id, {
        telefone: telefone.trim() || undefined,
        dominio: dominio.trim(),
        acessos: acessos.trim() || undefined,
        prioridade,
        status,
        coletar_acessos: coletarAcessos,
        arquivos: arquivosFinal,
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
          <DialogDescription className="sr-only">
            {editing ? "Formulário para editar telefone, domínio e acessos da instalação." : "Detalhes da instalação."}
          </DialogDescription>
        </DialogHeader>
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="detail-telefone">Telefone</Label>
              <Input
                id="detail-telefone"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-dominio">Domínio</Label>
              <Input
                id="detail-dominio"
                value={dominio}
                onChange={(e) => setDominio(e.target.value)}
                placeholder="exemplo.com.br"
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="detail-coletar-acessos"
                checked={coletarAcessos}
                onChange={(e) => setColetarAcessos(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="detail-coletar-acessos" className="font-normal cursor-pointer">
                Coletar Acessos
              </Label>
            </div>
            <div className="space-y-3">
              <Label className="block">Arquivos</Label>
              {(arquivosList.length > 0 || newFiles.length > 0) && (
                <ul className="text-sm space-y-1.5">
                  {arquivosList.map((arq, i) => (
                    <li key={`e-${i}`} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                      <a
                        href={arq.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate flex-1 text-primary hover:underline flex items-center gap-1.5"
                      >
                        <Download className="h-4 w-4 shrink-0" />
                        {arq.name}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeArquivo(i)}
                        aria-label="Remover arquivo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {newFiles.map((file, i) => (
                    <li key={`n-${i}`} className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-2 py-1.5">
                      <span className="truncate flex-1 text-sm">{file.name} (novo)</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeNewFile(i)}
                        aria-label="Remover"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={detailFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleDetailFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => detailFileInputRef.current?.click()}
                disabled={submitting}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Adicionar arquivos
              </Button>
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
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  {PRIORIDADE_LABEL[instalacao.prioridade ?? "normal"]}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone</span>
                <p className="font-medium">{instalacao.telefone ? formatTelefone(instalacao.telefone) : "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Criado em</span>
                <p className="font-medium">{dataCriacao}</p>
              </div>
              {instalacao.coletar_acessos && (
                <div className="col-span-2">
                  <span className="inline-flex items-center rounded border border-amber-400/60 bg-amber-500/15 px-2 py-1 text-amber-700 dark:text-amber-300 text-sm font-medium">
                    Coletar Acessos
                  </span>
                </div>
              )}
            </div>
            {instalacao.acessos && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Acessos</span>
                <pre className="text-sm bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                  {instalacao.acessos}
                </pre>
              </div>
            )}
            {instalacao.arquivos && instalacao.arquivos.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Arquivos</span>
                <ul className="text-sm space-y-1.5">
                  {instalacao.arquivos.map((arq, i) => (
                    <li key={i}>
                      <a
                        href={arq.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <Download className="h-4 w-4 shrink-0" />
                        {arq.name}
                      </a>
                    </li>
                  ))}
                </ul>
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
  onSubmit: (data: { telefone?: string; dominio?: string; acessos?: string; prioridade?: PrioridadeInstalacao; coletar_acessos?: boolean; arquivos?: InstalacaoArquivo[] }) => void;
}

function NewInstalacaoModal({ open, onClose, onSubmit }: NewInstalacaoModalProps) {
  const [telefone, setTelefone] = useState("");
  const [dominio, setDominio] = useState("");
  const [acessos, setAcessos] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeInstalacao>("normal");
  const [coletarAcessos, setColetarAcessos] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTelefone("");
    setDominio("");
    setAcessos("");
    setPrioridade("normal");
    setColetarAcessos(false);
    setFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const arquivos: InstalacaoArquivo[] = [];
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `instalacoes/uploads/${Date.now()}-${i}-${safeName}`;
          const { data, error } = await supabase.storage.from(BUCKET_INSTALACOES).upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });
          if (error) {
            toast.error(`Falha ao enviar "${file.name}". ${error.message}`);
            setSubmitting(false);
            return;
          }
          const { data: urlData } = supabase.storage.from(BUCKET_INSTALACOES).getPublicUrl(data.path);
          arquivos.push({ name: file.name, url: urlData.publicUrl });
        }
      }
      await onSubmit({
        telefone: telefone.trim() || undefined,
        dominio: dominio.trim(),
        acessos: acessos.trim() || undefined,
        prioridade,
        coletar_acessos: coletarAcessos,
        arquivos: arquivos.length ? arquivos : undefined,
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
          <DialogDescription className="sr-only">
            Formulário para cadastrar nova instalação: telefone, domínio, prioridade e acessos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(formatTelefone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dominio">Domínio</Label>
            <Input
              id="dominio"
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
              placeholder="exemplo.com.br"
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="coletar-acessos"
              checked={coletarAcessos}
              onChange={(e) => setColetarAcessos(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="coletar-acessos" className="font-normal cursor-pointer">
              Coletar Acessos
            </Label>
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
          <div className="space-y-3">
            <Label className="block">Arquivos</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Selecionar arquivos
            </Button>
            {files.length > 0 && (
              <ul className="text-sm space-y-1 mt-3">
                {files.map((file, i) => (
                  <li key={`${file.name}-${i}`} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(i)}
                      aria-label="Remover arquivo"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
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
