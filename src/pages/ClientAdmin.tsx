import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Plus, Search, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientTable } from "@/components/ClientTable";
import { ClientDetails } from "@/components/ClientDetails";
import { NewClientModal } from "@/components/NewClientModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { UsuarioSAASAgente, VersaoSAASAgente } from "@/types/database";

export function ClientAdmin() {
  const [clients, setClients] = useState<UsuarioSAASAgente[]>([]);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsClient, setDetailsClient] = useState<UsuarioSAASAgente | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [filterNuncaInstalado, setFilterNuncaInstalado] = useState(false);
  const [filterSemAnonKey, setFilterSemAnonKey] = useState(false);
  const [filterUltimaVersao, setFilterUltimaVersao] = useState(false);

  const fetchClients = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      let query = supabase.from("usuarios_SAAS_Agentes").select("*");
      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`nomeSoftware.ilike.${term},email.ilike.${term},dominio.ilike.${term}`);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
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

  const filteredClients = useMemo(() => {
    if (!filterNuncaInstalado && !filterSemAnonKey && !filterUltimaVersao) return clients;
    return clients.filter((c) => {
      if (filterNuncaInstalado) {
        const nuncaInstalado = c.dominio == null || String(c.dominio).trim() === "";
        if (!nuncaInstalado) return false;
      }
      if (filterSemAnonKey) {
        const semAnonKey = c.supabase_anon_key == null || String(c.supabase_anon_key).trim() === "";
        if (!semAnonKey) return false;
      }
      if (filterUltimaVersao && latestVersion) {
        if (c.versao !== latestVersion) return false;
      }
      return true;
    });
  }, [clients, latestVersion, filterNuncaInstalado, filterSemAnonKey, filterUltimaVersao]);

  const hasActiveFilter = filterNuncaInstalado || filterSemAnonKey || filterUltimaVersao;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">Clientes</h1>
          {!loading && (
            <Badge variant="secondary" className="font-normal text-sm">
              {hasActiveFilter ? `${filteredClients.length} de ${clients.length}` : clients.length} {clients.length === 1 ? "cliente" : "clientes"}
            </Badge>
          )}
        </div>
        <Button onClick={() => setNewClientOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo cliente
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Lista de clientes</CardTitle>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-2">
            <div className="relative w-full sm:max-w-sm shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou domínio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterNuncaInstalado ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterNuncaInstalado((v) => !v)}
              >
                Nunca instalado
              </Button>
              <Button
                variant={filterSemAnonKey ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterSemAnonKey((v) => !v)}
              >
                Sem Anon Key
              </Button>
              <Button
                variant={filterUltimaVersao ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterUltimaVersao((v) => !v)}
              >
                Última versão
              </Button>
            </div>
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
          ) : filteredClients.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhum cliente corresponde aos filtros selecionados.
            </div>
          ) : (
            <ClientTable
              clients={filteredClients}
              latestVersion={latestVersion}
              onViewDetails={setDetailsClient}
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
