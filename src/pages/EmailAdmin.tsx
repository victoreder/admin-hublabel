import { useState, useEffect, useMemo } from "react";
import { Send, Save, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UsuarioSAASAgente, ModeloEmail } from "@/types/database";

const VARIAVEIS = [
  { key: "nomeSoftware", label: "Nome do software" },
  { key: "dominio", label: "Domínio" },
  { key: "email", label: "Email" },
  { key: "versao", label: "Versão" },
] as const;

function replaceVars(
  client: Pick<UsuarioSAASAgente, "nomeSoftware" | "dominio" | "email" | "versao">,
  text: string
): string {
  return text
    .replace(/\{\{nomeSoftware\}\}/g, client.nomeSoftware ?? "")
    .replace(/\{\{dominio\}\}/g, client.dominio ?? "")
    .replace(/\{\{email\}\}/g, client.email ?? "")
    .replace(/\{\{versao\}\}/g, client.versao ?? "");
}

type FilterMode = "all" | "individual" | "version" | "missingAnonKey";

export function EmailAdmin() {
  const [clients, setClients] = useState<UsuarioSAASAgente[]>([]);
  const [modelos, setModelos] = useState<ModeloEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [selectedModeloId, setSelectedModeloId] = useState<string>("");
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [modeloNome, setModeloNome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingModelo, setIsSavingModelo] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clientsRes, modelosRes] = await Promise.all([
          supabase
            .from("usuarios_SAAS_Agentes")
            .select("id, nomeSoftware, email, dominio, versao, supabase_anon_key, supabase_apikey")
            .order("nomeSoftware"),
          supabase.from("modelos_email").select("*").order("created_at", { ascending: false }),
        ]);
        if (clientsRes.error) throw clientsRes.error;
        if (modelosRes.error) throw modelosRes.error;
        setClients((clientsRes.data as UsuarioSAASAgente[]) ?? []);
        setModelos((modelosRes.data as ModeloEmail[]) ?? []);
      } catch {
        setClients([]);
        setModelos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const m = modelos.find((x) => x.id === selectedModeloId);
    if (m) {
      setAssunto(m.assunto);
      setCorpo(m.corpo);
    }
  }, [selectedModeloId, modelos]);

  const versions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      if (c.versao?.trim()) set.add(c.versao.trim());
    });
    return Array.from(set).sort();
  }, [clients]);

  const recipients = useMemo(() => {
    if (filterMode === "all") return clients;
    if (filterMode === "individual") {
      const c = clients.find((x) => x.id === selectedClientId);
      return c ? [c] : [];
    }
    if (filterMode === "version") {
      if (!selectedVersion) return [];
      return clients.filter((c) => (c.versao ?? "").trim() === selectedVersion);
    }
    if (filterMode === "missingAnonKey") {
      return clients.filter(
        (c) => !(c.supabase_anon_key?.trim() || c.supabase_apikey?.trim())
      );
    }
    return [];
  }, [clients, filterMode, selectedClientId, selectedVersion]);

  const sendEmail = async (
    destinatarios: string[],
    assuntoEnvio: string = assunto,
    corpoEnvio: string = corpo
  ) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) {
      toast.error("Backend não configurado. Defina VITE_BACKEND_URL.");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${backendUrl}/api/enviar-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
      },
      body: JSON.stringify({ destinatarios, assunto: assuntoEnvio, corpo: corpoEnvio }),
    });
    if (!res.ok) throw new Error("Falha ao enviar");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assunto.trim()) {
      toast.error("Informe o assunto.");
      return;
    }
    if (!corpo.trim()) {
      toast.error("Informe o corpo do email.");
      return;
    }
    if (recipients.length === 0) {
      toast.error("Nenhum destinatário selecionado.");
      return;
    }
    setIsSubmitting(true);
    try {
      const hasVars = /\{\{(?:nomeSoftware|dominio|email|versao)\}\}/.test(assunto + corpo);
      if (hasVars) {
        for (const c of recipients) {
          await sendEmail(
            [c.email],
            replaceVars(c, assunto),
            replaceVars(c, corpo)
          );
        }
      } else {
        await sendEmail(recipients.map((c) => c.email));
      }
      toast.success("Email(s) enviado(s) com sucesso!");
    } catch {
      toast.error("Erro ao enviar email. Verifique o Backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTest = async () => {
    const email = testEmail.trim();
    if (!email) {
      toast.error("Informe o email para teste.");
      return;
    }
    if (!assunto.trim()) {
      toast.error("Informe o assunto.");
      return;
    }
    if (!corpo.trim()) {
      toast.error("Informe o corpo do email.");
      return;
    }
    setIsSendingTest(true);
    try {
      const clienteTeste = {
        nomeSoftware: "Cliente Teste",
        dominio: "exemplo.com",
        email,
        versao: "1.0",
      };
      await sendEmail(
        [email],
        replaceVars(clienteTeste, assunto),
        replaceVars(clienteTeste, corpo)
      );
      toast.success("Email de teste enviado para " + email);
    } catch {
      toast.error("Erro ao enviar email de teste. Verifique o Backend.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveModelo = async () => {
    if (!assunto.trim() || !corpo.trim()) {
      toast.error("Preencha assunto e corpo para salvar modelo.");
      return;
    }
    const nome = modeloNome.trim() || assunto.slice(0, 50);
    setIsSavingModelo(true);
    try {
      const { data, error } = await supabase
        .from("modelos_email")
        .insert({ nome, assunto, corpo })
        .select()
        .single();
      if (error) throw error;
      setModelos((prev) => [data as ModeloEmail, ...prev]);
      setModeloNome("");
      toast.success("Modelo salvo!");
    } catch {
      toast.error("Erro ao salvar modelo.");
    } finally {
      setIsSavingModelo(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Emails</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compor e enviar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Escreva diretamente, use um modelo salvo ou salve como modelo para reutilizar depois.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label>Destinatários</Label>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-stretch sm:items-end">
                <div className="w-full sm:min-w-[200px]">
                  <Select
                    value={filterMode}
                    onValueChange={(v) => {
                      setFilterMode(v as FilterMode);
                      setSelectedClientId("");
                      setSelectedVersion("");
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Tipo de filtro..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      <SelectItem value="individual">Um cliente (individual)</SelectItem>
                      <SelectItem value="version">Por versão</SelectItem>
                      <SelectItem value="missingAnonKey">Sem anon key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filterMode === "individual" && (
                  <div className="w-full sm:min-w-[220px]">
                    <Select
                      value={selectedClientId}
                      onValueChange={setSelectedClientId}
                      disabled={loading}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nomeSoftware} ({c.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {filterMode === "version" && (
                  <div className="w-full sm:min-w-[180px]">
                    <Select
                      value={selectedVersion}
                      onValueChange={setSelectedVersion}
                      disabled={loading}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione a versão..." />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {recipients.length} destinatário(s) selecionado(s)
              </p>
            </div>

            <div>
              <Label>Modelo salvo (opcional)</Label>
              <Select value={selectedModeloId} onValueChange={setSelectedModeloId}>
                <SelectTrigger className="w-full sm:max-w-sm mt-1">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assunto">Assunto</Label>
              <Input
                id="assunto"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Assunto (pode usar {{nomeSoftware}}, {{email}}, etc.)"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="corpo">Corpo</Label>
              <textarea
                id="corpo"
                rows={8}
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                placeholder="Conteúdo do email (texto ou HTML). Use {{nomeSoftware}}, {{dominio}}, {{email}}, {{versao}} para personalizar."
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variáveis: {VARIAVEIS.map((v) => "{{" + v.key + "}}").join(", ")}
              </p>
            </div>

            {/* Preview com variáveis substituídas */}
            <div className="rounded-lg border border-muted-foreground/30 bg-muted/20 p-4 space-y-3">
              <Label className="text-muted-foreground">Preview (HTML com variáveis)</Label>
              {(() => {
                const previewClient: Pick<UsuarioSAASAgente, "nomeSoftware" | "dominio" | "email" | "versao"> =
                  recipients.length > 0
                    ? recipients[0]
                    : {
                        nomeSoftware: "Nome do Cliente",
                        dominio: "exemplo.com",
                        email: "email@exemplo.com",
                        versao: "1.0.0",
                      };
                const assuntoPreview = replaceVars(previewClient, assunto);
                const corpoPreview = replaceVars(previewClient, corpo);
                return (
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Assunto: </span>
                      <span className="text-sm font-medium">{assuntoPreview || "(vazio)"}</span>
                    </div>
                    <div className="border rounded-md bg-background overflow-auto max-h-[320px] min-h-[120px]">
                      <div
                        className="p-3 text-sm prose prose-sm max-w-none [&_img]:max-w-full"
                        dangerouslySetInnerHTML={{
                          __html: corpoPreview
                            ? corpoPreview.includes("<")
                              ? corpoPreview
                              : "<pre class='whitespace-pre-wrap m-0 font-sans'>" + corpoPreview.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</pre>"
                            : "<span class='text-muted-foreground'>(vazio)</span>",
                        }}
                      />
                    </div>
                    {recipients.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Preview usando: {previewClient.nomeSoftware} ({previewClient.email})
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 space-y-2">
              <Label className="text-muted-foreground">Enviar email de teste</Label>
              <p className="text-sm text-muted-foreground">
                Use o mesmo assunto e corpo acima. Informe o email que receberá o teste.
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="max-w-[280px]"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSendTest}
                  disabled={isSendingTest || !testEmail.trim() || !assunto.trim() || !corpo.trim()}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {isSendingTest ? "Enviando teste..." : "Enviar teste"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting || recipients.length === 0}>
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? "Enviando..." : "Enviar"}
              </Button>
              <Button type="button" variant="outline" onClick={handleSaveModelo} disabled={isSavingModelo}>
                <Save className="h-4 w-4 mr-2" />
                Salvar como modelo
              </Button>
              <Input
                placeholder="Nome do modelo (opcional)"
                value={modeloNome}
                onChange={(e) => setModeloNome(e.target.value)}
                className="max-w-[200px]"
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
