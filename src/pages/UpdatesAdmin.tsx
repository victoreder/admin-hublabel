import { useState, useEffect } from "react";
import { Plus, Package, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/** Extrai bucket e path de uma URL do Supabase Storage (object/public). Retorna null se não for do nosso Storage. */
function parseStorageUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url || typeof url !== "string") return null;
  const base = import.meta.env.VITE_SUPABASE_URL ?? "";
  if (!base && !url.includes("/storage/v1/object/public/")) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const bucket = match[1];
  const path = decodeURIComponent(match[2]);
  if (!bucket || !path) return null;
  if (base && !url.startsWith(base)) return null;
  return { bucket, path };
}
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UpdatesTable } from "@/components/UpdatesTable";
import { NewUpdateModal } from "@/components/NewUpdateModal";
import { EditUpdateModal } from "@/components/EditUpdateModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { VersaoSAASAgente } from "@/types/database";

export function UpdatesAdmin() {
  const [updates, setUpdates] = useState<VersaoSAASAgente[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUpdateOpen, setNewUpdateOpen] = useState(false);
  const [editUpdate, setEditUpdate] = useState<VersaoSAASAgente | null>(null);
  const [deleteUpdate, setDeleteUpdate] = useState<VersaoSAASAgente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("versoes_SAAS_Agentes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUpdates((data as VersaoSAASAgente[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar atualizações";
      toast.error(msg);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleCreated = () => {
    setNewUpdateOpen(false);
    fetchUpdates();
    toast.success("Atualização registrada. O webhook notificará os clientes.");
  };

  const handleEditSuccess = () => {
    setEditUpdate(null);
    fetchUpdates();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteUpdate?.id) return;
    setDeleting(true);
    try {
      const storageRef = parseStorageUrl(deleteUpdate.linkVersao);
      if (storageRef) {
        const { error: storageError } = await supabase.storage
          .from(storageRef.bucket)
          .remove([storageRef.path]);
        if (storageError) console.warn("Arquivo no Storage não removido:", storageError.message);
      }
      const { error } = await supabase
        .from("versoes_SAAS_Agentes")
        .delete()
        .eq("id", deleteUpdate.id);
      if (error) throw error;
      setDeleteUpdate(null);
      fetchUpdates();
      toast.success("Atualização excluída.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Atualizações</h1>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <Link to="/changelog" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver changelog público
            </Button>
          </Link>
          <Button onClick={() => setNewUpdateOpen(true)} className="w-full sm:w-auto min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />
            Nova atualização
          </Button>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Histórico de versões</CardTitle>
        </CardHeader>
        <CardContent className="w-full overflow-x-auto">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <Package className="h-12 w-12 text-primary" />
              </div>
              <p className="text-muted-foreground mb-2">Nenhuma atualização registrada.</p>
              <p className="text-sm text-muted-foreground mb-6">Registre a primeira versão para notificar os clientes.</p>
              <Button onClick={() => setNewUpdateOpen(true)}>Criar primeira atualização</Button>
            </div>
          ) : (
            <UpdatesTable
              updates={updates}
              onEdit={(u) => setEditUpdate(u)}
              onDelete={(u) => setDeleteUpdate(u)}
            />
          )}
        </CardContent>
      </Card>

      <NewUpdateModal
        open={newUpdateOpen}
        onClose={() => setNewUpdateOpen(false)}
        onSuccess={handleCreated}
      />

      <EditUpdateModal
        open={!!editUpdate}
        onClose={() => setEditUpdate(null)}
        onSuccess={handleEditSuccess}
        update={editUpdate}
      />

      <Dialog open={!!deleteUpdate} onOpenChange={(o) => !o && setDeleteUpdate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir atualização</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir a versão <strong>{deleteUpdate?.nomeVersao}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUpdate(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
