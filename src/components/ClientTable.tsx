import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, RefreshCw, Mail, KeyRound, Check } from "lucide-react";
import { AccessDialog } from "@/components/AccessDialog";
import { UpdateConfirmDialog, type UpdateType } from "@/components/UpdateConfirmDialog";
import { AnonKeyDialog } from "@/components/AnonKeyDialog";
import { getBackendUrl } from "@/lib/utils";
import type { UsuarioSAASAgente, ModeloEmail } from "@/types/database";

function replaceVars(
  client: Pick<UsuarioSAASAgente, "nomeSoftware" | "dominio" | "email" | "versao">,
  text: string
): string {
  return (text ?? "")
    .replace(/\{\{nomeSoftware\}\}/g, client.nomeSoftware ?? "")
    .replace(/\{\{dominio\}\}/g, client.dominio ?? "")
    .replace(/\{\{email\}\}/g, client.email ?? "")
    .replace(/\{\{versao\}\}/g, client.versao ?? "");
}

interface ClientTableProps {
  clients: UsuarioSAASAgente[];
  latestVersion: string | null;
  onViewDetails: (client: UsuarioSAASAgente) => void;
  onNotifyUpdate: (client: UsuarioSAASAgente, tipo: UpdateType) => void;
  onClientUpdated?: () => void;
}

export function ClientTable({
  clients,
  latestVersion,
  onViewDetails,
  onNotifyUpdate,
  onClientUpdated,
}: ClientTableProps) {
  const [modelos, setModelos] = useState<ModeloEmail[]>([]);
  const [accessClient, setAccessClient] = useState<UsuarioSAASAgente | null>(null);
  const [updateClient, setUpdateClient] = useState<UsuarioSAASAgente | null>(null);
  const [anonKeyClient, setAnonKeyClient] = useState<UsuarioSAASAgente | null>(null);

  useEffect(() => {
    supabase.from("modelos_email").select("id, nome, assunto, corpo").order("nome").then(({ data }) => {
      setModelos((data as ModeloEmail[]) ?? []);
    });
  }, []);

  const handleSendEmail = async (client: UsuarioSAASAgente, modelo: ModeloEmail) => {
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      toast.error("Backend não configurado.");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${backendUrl}/api/enviar-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          destinatarios: [client.email],
          assunto: replaceVars(client, modelo.assunto ?? ""),
          corpo: replaceVars(client, modelo.corpo ?? ""),
        }),
      });
      if (!res.ok) throw new Error("Falha");
      toast.success(`Email enviado para ${client.nomeSoftware}`);
    } catch {
      toast.error("Erro ao enviar email.");
    }
  };

  return (
    <>
    {/* Lista em cards para mobile */}
    <div className="space-y-3 md:hidden">
      {clients.map((client) => {
        const isLatest = latestVersion && client.versao === latestVersion;
        // usuarios_SAAS_Agentes: supabase_anon_key vazia = faltando anon key; dominio vazia = nunca instalado
        const missingAnonKey = client.supabase_anon_key == null || String(client.supabase_anon_key).trim() === "";
        const nuncaInstalado = client.dominio == null || String(client.dominio).trim() === "";
        return (
          <Card key={client.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{client.nomeSoftware || "-"}</p>
                  <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                  {nuncaInstalado && (
                    <Badge variant="secondary" className="text-xs mt-1">Nunca Instalado</Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{client.dominio?.trim() || "-"}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-sm">{client.versao ?? "-"}</span>
                    {isLatest && (
                      <Badge variant="default" className="bg-primary/90 text-xs">Última</Badge>
                    )}
                    {client.acessoAtualizacao && (
                      <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
                        <Check className="h-3 w-3 inline mr-0.5" />
                      </Badge>
                    )}
                    {missingAnonKey && (
                      <Badge
                        variant="destructive"
                        className="text-xs cursor-pointer"
                        onClick={() => setAnonKeyClient(client)}
                      >
                        Anon Key
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px] shrink-0">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom">
                    <DropdownMenuItem
                      disabled={!client.acessoAtualizacao}
                      onClick={() => client.acessoAtualizacao && setUpdateClient(client)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewDetails(client)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAccessClient(client)}>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Ver acessos
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar email
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {modelos.length === 0 ? (
                          <DropdownMenuItem disabled>Nenhum modelo salvo</DropdownMenuItem>
                        ) : (
                          modelos.map((m) => (
                            <DropdownMenuItem
                              key={m.id}
                              onClick={() => handleSendEmail(client, m)}
                            >
                              {m.nome}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>

    <Table className="hidden md:table">
      <TableHeader>
        <TableRow>
          <TableHead>Nome / Email</TableHead>
          <TableHead>Domínio</TableHead>
          <TableHead>Versão</TableHead>
          <TableHead className="w-[80px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          const isLatest = latestVersion && client.versao === latestVersion;
          // usuarios_SAAS_Agentes: supabase_anon_key vazia = faltando anon key; dominio vazia = nunca instalado
          const missingAnonKey = client.supabase_anon_key == null || String(client.supabase_anon_key).trim() === "";
          const nuncaInstalado = client.dominio == null || String(client.dominio).trim() === "";
          return (
            <TableRow key={client.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{client.nomeSoftware || "-"}</p>
                  <p className="text-sm text-muted-foreground">{client.email}</p>
                  {nuncaInstalado && (
                    <Badge variant="secondary" className="text-xs mt-1">Nunca Instalado</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{client.dominio?.trim() || "-"}</span>
                  {missingAnonKey && (
                    <Badge
                      variant="destructive"
                      className="text-xs cursor-pointer hover:opacity-90"
                      onClick={() => setAnonKeyClient(client)}
                      title="Clique para inserir Anon Key"
                    >
                      Faltando Anon Key
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{client.versao ?? "-"}</span>
                  {isLatest && (
                    <Badge variant="default" className="bg-primary/90">Última versão</Badge>
                  )}
                  {client.acessoAtualizacao && (
                    <Badge variant="secondary" className="text-xs bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 p-0.5" title="Acesso às atualizações">
                      <Check className="h-3.5 w-3.5" />
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={!client.acessoAtualizacao}
                      title={!client.acessoAtualizacao ? "Cliente sem acesso à atualização" : undefined}
                      onClick={() => client.acessoAtualizacao && setUpdateClient(client)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewDetails(client)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAccessClient(client)}>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Ver acessos
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar email
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {modelos.length === 0 ? (
                          <DropdownMenuItem disabled>Nenhum modelo salvo</DropdownMenuItem>
                        ) : (
                          modelos.map((m) => (
                            <DropdownMenuItem
                              key={m.id}
                              onClick={() => handleSendEmail(client, m)}
                            >
                              {m.nome}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    <AccessDialog client={accessClient} open={!!accessClient} onClose={() => setAccessClient(null)} />
    <UpdateConfirmDialog
      client={updateClient}
      open={!!updateClient}
      onClose={() => setUpdateClient(null)}
      onConfirm={(c, tipo) => {
        onNotifyUpdate(c, tipo);
        setUpdateClient(null);
      }}
    />
    <AnonKeyDialog
      client={anonKeyClient}
      open={!!anonKeyClient}
      onClose={() => setAnonKeyClient(null)}
      onSaved={() => onClientUpdated?.()}
    />
  </>
  );
}
