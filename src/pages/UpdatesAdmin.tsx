import { useState, useEffect } from "react";
import { Plus, Package, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdatesTable } from "@/components/UpdatesTable";
import { NewUpdateModal } from "@/components/NewUpdateModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { VersaoSAASAgente } from "@/types/database";

export function UpdatesAdmin() {
  const [updates, setUpdates] = useState<VersaoSAASAgente[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUpdateOpen, setNewUpdateOpen] = useState(false);

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
            <UpdatesTable updates={updates} />
          )}
        </CardContent>
      </Card>

      <NewUpdateModal
        open={newUpdateOpen}
        onClose={() => setNewUpdateOpen(false)}
        onSuccess={handleCreated}
      />
    </div>
  );
}
