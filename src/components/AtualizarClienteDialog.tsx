import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";
import type { UsuarioSAASAgente, VersaoSAASAgente } from "@/types/database";

interface AtualizarClienteDialogProps {
  client: UsuarioSAASAgente | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AtualizarClienteDialog({
  client,
  open,
  onClose,
  onSuccess,
}: AtualizarClienteDialogProps) {
  const [versoes, setVersoes] = useState<VersaoSAASAgente[]>([]);
  const [selectedVersaoId, setSelectedVersaoId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingVersoes, setLoadingVersoes] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingVersoes(true);
      supabase
        .from("versoes_SAAS_Agentes")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error("Erro ao carregar versões:", error);
            toast.error("Erro ao carregar versões.");
            setVersoes([]);
          } else {
            const list = (data as VersaoSAASAgente[]) ?? [];
            const comLink = list.filter((v) => {
              const link = v.linkVersao;
              return link != null && String(link).trim() !== "";
            });
            setVersoes(comLink);
            setSelectedVersaoId(comLink.length > 0 ? String(comLink[0].id) : "");
          }
          setLoadingVersoes(false);
        });
    } else {
      setSelectedVersaoId("");
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!client || !selectedVersaoId) return;
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      toast.error("Backend não configurado. Defina VITE_BACKEND_URL.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/atualizar-cliente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, versionId: selectedVersaoId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Erro ${res.status}`);
      }
      toast.success(data?.message ?? "Atualização enviada com sucesso.");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar cliente.");
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  const nome = client.nomeSoftware || client.email || "Cliente";
  const hasAnonKey = client.supabase_anon_key != null && String(client.supabase_anon_key).trim() !== "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showClose>
        <DialogHeader>
          <DialogTitle>Atualizar cliente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Instalar versão para <strong className="text-foreground">{nome}</strong>. Será enviado para o disparamator,
          email em caso de sucesso e o log será salvo.
        </p>
        {!hasAnonKey ? (
          <p className="text-sm text-destructive">
            Este cliente não possui Anon Key preenchida. Preencha antes de atualizar.
          </p>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Versão</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={selectedVersaoId}
              onChange={(e) => setSelectedVersaoId(e.target.value)}
              disabled={loadingVersoes}
            >
              {versoes.length === 0 ? (
                <option value="">
                  {loadingVersoes ? "Carregando..." : "Nenhuma versão com link"}
                </option>
              ) : (
                versoes.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.nomeVersao ?? v.id}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !hasAnonKey || !selectedVersaoId || loadingVersoes || versoes.length === 0}
          >
            {loading ? (
              "Enviando..."
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
