import { useState, useEffect } from "react";
import { FileText, CheckCircle, XCircle, Mail, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { AtualizacaoTodoLog, VersaoSAASAgente } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LogWithRelations extends AtualizacaoTodoLog {
  versoes_SAAS_Agentes?: { nomeVersao?: string } | null;
  usuarios_SAAS_Agentes?: { nomeSoftware?: string; email?: string } | null;
}

export function LogsAtualizacaoAdmin() {
  const [logs, setLogs] = useState<LogWithRelations[]>([]);
  const [versoes, setVersoes] = useState<VersaoSAASAgente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVersao, setFilterVersao] = useState<string>("all");
  const [filterStatusAtualizacao, setFilterStatusAtualizacao] = useState<string>("all");
  const [filterStatusEmail, setFilterStatusEmail] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, versoesRes, clientesRes] = await Promise.all([
        supabase
          .from("atualizacao_todos_logs")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("versoes_SAAS_Agentes").select("*").order("created_at", { ascending: false }),
        supabase.from("usuarios_SAAS_Agentes").select("*"),
      ]);
      if (logsRes.error) {
        console.error("Erro ao carregar logs:", logsRes.error);
        throw logsRes.error;
      }
      if (versoesRes.error) {
        console.error("Erro ao carregar versões:", versoesRes.error);
        throw versoesRes.error;
      }
      if (clientesRes.error) {
        console.error("Erro ao carregar clientes:", clientesRes.error);
        throw clientesRes.error;
      }
      const versoesList = (versoesRes.data as VersaoSAASAgente[]) ?? [];
      const clientesList = (clientesRes.data as { id: string; nomeSoftware?: string; email?: string }[]) ?? [];
      const clientesMap = new Map(clientesList.map((c) => [c.id, { nomeSoftware: c.nomeSoftware, email: c.email }]));
      const versoesMap = new Map(versoesList.map((v) => [String(v.id), v]));
      const logsWithRelations: LogWithRelations[] = ((logsRes.data as AtualizacaoTodoLog[]) ?? []).map((l) => ({
        ...l,
        versoes_SAAS_Agentes: versoesMap.get(String(l.versao_id)) ?? null,
        usuarios_SAAS_Agentes: clientesMap.get(l.cliente_id) ?? null,
      }));
      setLogs(logsWithRelations);
      setVersoes(versoesList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar logs.");
      setLogs([]);
      setVersoes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (filterVersao !== "all" && String(l.versao_id) !== filterVersao) return false;
    if (filterStatusAtualizacao !== "all" && l.status_atualizacao !== filterStatusAtualizacao) return false;
    if (filterStatusEmail !== "all" && l.status_email !== filterStatusEmail) return false;
    return true;
  });

  const getNomeVersao = (l: LogWithRelations) => {
    const v = l.versoes_SAAS_Agentes;
    if (!v || typeof v !== "object") return "-";
    return (v as { nomeVersao?: string }).nomeVersao ?? "-";
  };

  const getClienteLabel = (l: LogWithRelations) => {
    const c = l.usuarios_SAAS_Agentes;
    if (!c || typeof c !== "object") return "-";
    const u = c as { nomeSoftware?: string; email?: string };
    if (u.nomeSoftware?.trim()) return `${u.nomeSoftware} (${u.email ?? "-"})`;
    return u.email ?? "-";
  };

  const StatusAtualizacaoBadge = ({ status }: { status: string }) => {
    if (status === "sucesso")
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white border-0">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sucesso
        </Badge>
      );
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Erro
      </Badge>
    );
  };

  const StatusEmailBadge = ({ status }: { status: string }) => {
    if (status === "sucesso")
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white border-0">
          <Mail className="h-3 w-3 mr-1" />
          Sucesso
        </Badge>
      );
    if (status === "erro")
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Erro
        </Badge>
      );
    return (
      <Badge variant="secondary">
        Pendente
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Logs</h1>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logs do Atualizar todos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Versão:</span>
              <Select value={filterVersao} onValueChange={setFilterVersao}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {versoes.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.nomeVersao ?? v.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Atualização:</span>
              <Select value={filterStatusAtualizacao} onValueChange={setFilterStatusAtualizacao}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sucesso">Sucesso</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Email:</span>
              <Select value={filterStatusEmail} onValueChange={setFilterStatusEmail}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="sucesso">Sucesso</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Nenhum log encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status atualização</TableHead>
                    <TableHead>Mensagem atualização</TableHead>
                    <TableHead>Resposta API</TableHead>
                    <TableHead>Status email</TableHead>
                    <TableHead>Mensagem email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap">
                        {l.created_at
                          ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>{getNomeVersao(l)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{getClienteLabel(l)}</TableCell>
                      <TableCell>
                        <StatusAtualizacaoBadge status={l.status_atualizacao} />
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={l.mensagem_atualizacao ?? undefined}>
                        {l.mensagem_atualizacao || "-"}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground font-mono" title={l.resposta_atualizacao ?? undefined}>
                        {l.resposta_atualizacao || "-"}
                      </TableCell>
                      <TableCell>
                        <StatusEmailBadge status={l.status_email} />
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={l.mensagem_email ?? undefined}>
                        {l.mensagem_email || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
