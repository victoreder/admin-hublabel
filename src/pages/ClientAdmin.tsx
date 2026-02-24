import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientTable } from "@/components/ClientTable";
import { ClientDetails } from "@/components/ClientDetails";
import { NewClientModal } from "@/components/NewClientModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { UsuarioSAASAgente, VersaoSAASAgente } from "@/types/database";
import type { UpdateType } from "@/components/UpdateConfirmDialog";

export function ClientAdmin() {
  const [clients, setClients] = useState<UsuarioSAASAgente[]>([]);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsClient, setDetailsClient] = useState<UsuarioSAASAgente | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);

  const fetchClients = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      let query = supabase.from("usuarios_SAAS_Agentes").select("*");
      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`nomeSoftware.ilike.${term},email.ilike.${term},dominio.ilike.${term}`);
      }
      const { data, error } = await query.order("nomeSoftware");
      if (error) throw error;
      setClients((data as UsuarioSAASAgente[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar clientes";
      toast.error(msg);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLatestVersion = useCallback(async () => {
    const { data } = await supabase
      .from("versoes_SAAS_Agentes")
      .select("nomeVersao")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    setLatestVersion((data as VersaoSAASAgente | null)?.nomeVersao ?? null);
  }, []);

  useEffect(() => {
    fetchLatestVersion();
  }, [fetchLatestVersion]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchClients(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search, fetchClients]);

  const handleClientCreated = () => {
    setNewClientOpen(false);
    fetchClients(search);
    fetchLatestVersion();
    toast.success("Cliente criado com sucesso!");
  };

  const handleNotifyUpdate = async (client: UsuarioSAASAgente, tipo: UpdateType) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) {
      toast.error("Backend não configurado. Defina VITE_BACKEND_URL.");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${backendUrl}/api/notificar-cliente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ clientId: client.id, tipo }),
      });
      if (!res.ok) throw new Error("Falha ao notificar");
      const tipoLabel = tipo === "tudo" ? "Atualização completa" : tipo === "sql" ? "SQL" : "App";
      toast.success(`${tipoLabel} enviada para ${client.nomeSoftware}`);
    } catch {
      toast.error("Erro ao enviar notificação. Verifique o Backend.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={() => setNewClientOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo cliente
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Lista de clientes</CardTitle>
          <div className="relative mt-2 w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou domínio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="w-full overflow-x-auto">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <EmptyState onAdd={() => setNewClientOpen(true)} />
          ) : (
            <ClientTable
              clients={clients}
              latestVersion={latestVersion}
              onViewDetails={setDetailsClient}
              onNotifyUpdate={handleNotifyUpdate}
              onClientUpdated={() => fetchClients(search)}
            />
          )}
        </CardContent>
      </Card>

      <ClientDetails
        client={detailsClient}
        open={!!detailsClient}
        onClose={() => setDetailsClient(null)}
        onClientUpdated={() => fetchClients(search)}
      />
      <NewClientModal
        open={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        onSuccess={handleClientCreated}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-primary/10 p-6 mb-4">
        <Users className="h-12 w-12 text-primary" />
      </div>
      <p className="text-muted-foreground mb-2">Nenhum cliente encontrado.</p>
      <p className="text-sm text-muted-foreground mb-6">Adicione seu primeiro cliente para começar.</p>
      <Button onClick={onAdd}>Adicionar primeiro cliente</Button>
    </div>
  );
}
