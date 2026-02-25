import { useState, useEffect, useMemo } from "react";
import { Send, Save, Mail, Sparkles, Users, FileText, ChevronRight, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBackendUrl } from "@/lib/utils";
import type { UsuarioSAASAgente, ModeloEmail } from "@/types/database";

const VARIAVEIS = [
  { key: "nomeSoftware", label: "Nome do software" },
  { key: "dominio", label: "Domínio" },
  { key: "email", label: "Email" },
  { key: "versao", label: "Versão" },
] as const;

const VARIAVEL_LINK_ANON_KEY = { key: "linkInserirAnonKey", label: "Link para inserir Anon Key" } as const;

function getLinkInserirAnonKey(anonKeyToken: string | undefined): string {
  if (!anonKeyToken) return "";
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/inserir-anon-key?id=${encodeURIComponent(anonKeyToken)}`;
}

function replaceVars(
  client: Pick<UsuarioSAASAgente, "nomeSoftware" | "dominio" | "email" | "versao" | "anon_key_token">,
  text: string
): string {
  return text
    .replace(/\{\{nomeSoftware\}\}/g, client.nomeSoftware ?? "")
    .replace(/\{\{dominio\}\}/g, client.dominio ?? "")
    .replace(/\{\{email\}\}/g, client.email ?? "")
    .replace(/\{\{versao\}\}/g, client.versao ?? "")
    .replace(/\{\{linkInserirAnonKey\}\}/g, getLinkInserirAnonKey(client.anon_key_token));
}

type FilterMode = "all" | "individual" | "version" | "missingAnonKey" | "nuncaInstalado";

const STEPS = [
  { id: 1, title: "Destinatários e conteúdo", icon: Users },
  { id: 2, title: "Revisar email", icon: FileText },
  { id: 3, title: "Enviar", icon: Send },
] as const;

export function EmailAdmin() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [clients, setClients] = useState<UsuarioSAASAgente[]>([]);
  const [modelos, setModelos] = useState<ModeloEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [excluirNuncaInstalados, setExcluirNuncaInstalados] = useState(false);
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
  const [instrucoesIA, setInstrucoesIA] = useState("");
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [showBodyEditor, setShowBodyEditor] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clientsRes, modelosRes] = await Promise.all([
          supabase
            .from("usuarios_SAAS_Agentes")
            .select("id, nomeSoftware, email, dominio, versao, supabase_anon_key, supabase_apikey, anon_key_token")
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
    if (filterMode === "nuncaInstalado") {
      return clients.filter(
        (c) => c.dominio == null || String(c.dominio).trim() === ""
      );
    }
    if (filterMode === "missingAnonKey") {
      const semAnon = clients.filter(
        (c) => c.supabase_anon_key == null || String(c.supabase_anon_key).trim() === ""
      );
      if (excluirNuncaInstalados) {
        return semAnon.filter(
          (c) => c.dominio != null && String(c.dominio).trim() !== ""
        );
      }
      return semAnon;
    }
    return [];
  }, [clients, filterMode, selectedClientId, selectedVersion, excluirNuncaInstalados]);

  const canGoToStep2 = recipients.length > 0 && corpo.trim().length > 0;
  const canGoToStep3 = assunto.trim().length > 0;

  const sendEmail = async (
    destinatarios: string[],
    assuntoEnvio: string = assunto,
    corpoEnvio: string = corpo
  ) => {
    const backendUrl = getBackendUrl();
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

  const handleSendNow = async (e: React.FormEvent) => {
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
    const validRecipients = recipients.filter((c) => typeof c.email === "string" && c.email.trim() !== "");
    if (validRecipients.length === 0) {
      toast.error("Nenhum destinatário com email válido.");
      return;
    }
    if (validRecipients.length < recipients.length) {
      toast.warning(`${recipients.length - validRecipients.length} destinatário(s) sem email foram ignorados.`);
    }
    setIsSubmitting(true);
    try {
      const hasVars = /\{\{(?:nomeSoftware|dominio|email|versao|linkInserirAnonKey)\}\}/.test(assunto + corpo);
      if (hasVars) {
        for (const c of validRecipients) {
          await sendEmail(
            [c.email],
            replaceVars(c, assunto),
            replaceVars(c, corpo)
          );
        }
      } else {
        await sendEmail(validRecipients.map((c) => c.email));
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
        anon_key_token: undefined,
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
    setIsSavingModelo(true);
    try {
      if (selectedModeloId) {
        const updates: { assunto: string; corpo: string; nome?: string } = { assunto, corpo };
        if (modeloNome.trim()) updates.nome = modeloNome.trim();
        const { data, error } = await supabase
          .from("modelos_email")
          .update(updates)
          .eq("id", selectedModeloId)
          .select()
          .single();
        if (error) throw error;
        setModelos((prev) => prev.map((m) => (m.id === selectedModeloId ? (data as ModeloEmail) : m)));
        toast.success("Modelo atualizado!");
      } else {
        const nome = modeloNome.trim() || assunto.slice(0, 50);
        const { data, error } = await supabase
          .from("modelos_email")
          .insert({ nome, assunto, corpo })
          .select()
          .single();
        if (error) throw error;
        setModelos((prev) => [data as ModeloEmail, ...prev]);
        setModeloNome("");
        toast.success("Modelo salvo!");
      }
    } catch {
      toast.error("Erro ao salvar modelo.");
    } finally {
      setIsSavingModelo(false);
    }
  };

  const handleGerarEmailIA = async () => {
    const text = instrucoesIA.trim();
    if (!text) {
      toast.error("Descreva o que deseja no email.");
      return;
    }
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      toast.error("Backend não configurado. Defina VITE_BACKEND_URL.");
      return;
    }
    const modelo = selectedModeloId ? modelos.find((m) => m.id === selectedModeloId) : null;
    const body: { instrucoes: string; modeloAtual?: { assunto?: string; corpo?: string } } = {
      instrucoes: text,
    };
    if (modelo && (modelo.assunto || modelo.corpo)) {
      body.modeloAtual = { assunto: modelo.assunto ?? "", corpo: modelo.corpo ?? "" };
    }
    setIsGeneratingIA(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${backendUrl}/api/gerar-email-ia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Falha ao gerar email com IA.");
        return;
      }
      if (data.html) {
        setCorpo(data.html);
        toast.success(
          modelo
            ? "Modelo editado pela IA. Avance para revisar e salve para atualizar o modelo."
            : "Email gerado. Avance para revisar."
        );
      } else {
        toast.error("Resposta inválida do backend.");
      }
    } catch {
      toast.error("Erro ao gerar email com IA. Verifique o Backend e OPENAI_API_KEY.");
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const handleAgendar = async () => {
    if (!scheduledAt.trim()) {
      toast.error("Selecione data e hora para o envio.");
      return;
    }
    if (!assunto.trim() || !corpo.trim() || recipients.length === 0) {
      toast.error("Complete destinatários, assunto e corpo.");
      return;
    }
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      toast.error("Backend não configurado. Defina VITE_BACKEND_URL.");
      return;
    }
    const dt = new Date(scheduledAt);
    if (Number.isNaN(dt.getTime()) || dt.getTime() <= Date.now()) {
      toast.error("Escolha uma data e hora futuras.");
      return;
    }
    setIsScheduling(true);
    try {
      const destinatariosPayload = recipients.map((c) => ({
        email: c.email,
        nomeSoftware: c.nomeSoftware ?? "",
        dominio: c.dominio ?? "",
        versao: c.versao ?? "",
        anon_key_token: c.anon_key_token ?? null,
      }));
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${backendUrl}/api/agendar-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          scheduledAt: dt.toISOString(),
          destinatarios: destinatariosPayload,
          assunto,
          corpo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Falha ao agendar.");
        return;
      }
      const formatted = dt.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      toast.success(`Agendado para ${formatted}. O email será enviado automaticamente.`);
      setScheduledAt("");
    } catch {
      toast.error("Erro ao agendar. Verifique o backend.");
    } finally {
      setIsScheduling(false);
    }
  };

  const previewClient: Pick<UsuarioSAASAgente, "nomeSoftware" | "dominio" | "email" | "versao" | "anon_key_token"> =
    recipients.length > 0
      ? recipients[0]
      : {
          nomeSoftware: "Nome do Cliente",
          dominio: "exemplo.com",
          email: "email@exemplo.com",
          versao: "1.0.0",
          anon_key_token: undefined,
        };
  const corpoPreview = replaceVars(previewClient, corpo);
  const assuntoPreview = replaceVars(previewClient, assunto);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="font-semibold tracking-tight text-[hsl(var(--foreground))] text-2xl sm:text-3xl">
          Emails
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Escolha destinatários, use um modelo ou gere com IA e envie em poucos passos.
        </p>

        {/* Stepper */}
        <nav className="mt-8 flex items-center gap-0 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-sm">
          {STEPS.map((s) => {
            const isActive = step === s.id;
            const isPast = step > s.id;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id as 1 | 2 | 3)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow"
                    : isPast
                      ? "text-primary hover:bg-primary/10"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
            );
          })}
        </nav>

        <Card className="mt-6 overflow-hidden border-[hsl(var(--border))] shadow-sm">
          <CardContent className="p-0">
            {/* Etapa 1: Destinatários e conteúdo */}
            {step === 1 && (
              <div className="space-y-8 p-6 sm:p-8">
                <div>
                  <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    Destinatários
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Quem receberá o email
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className="w-full min-w-0 sm:w-auto">
                      <Select
                        value={filterMode}
                        onValueChange={(v) => {
                          setFilterMode(v as FilterMode);
                          setSelectedClientId("");
                          setSelectedVersion("");
                        }}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Filtro..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os clientes</SelectItem>
                          <SelectItem value="individual">Um cliente</SelectItem>
                          <SelectItem value="version">Por versão</SelectItem>
                          <SelectItem value="missingAnonKey">Sem anon key</SelectItem>
                          <SelectItem value="nuncaInstalado">Nunca instalado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {filterMode === "missingAnonKey" && (
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                        <input
                          type="checkbox"
                          checked={excluirNuncaInstalados}
                          onChange={(e) => setExcluirNuncaInstalados(e.target.checked)}
                          className="rounded border-input"
                        />
                        Excluir nunca instalados
                      </label>
                    )}
                    {filterMode === "individual" && (
                      <Select
                        value={selectedClientId}
                        onValueChange={setSelectedClientId}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-full sm:w-[240px]">
                          <SelectValue placeholder="Cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nomeSoftware} ({c.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {filterMode === "version" && (
                      <Select
                        value={selectedVersion}
                        onValueChange={setSelectedVersion}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-full sm:w-[160px]">
                          <SelectValue placeholder="Versão..." />
                        </SelectTrigger>
                        <SelectContent>
                          {versions.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    {recipients.length} destinatário(s)
                  </p>
                </div>

                <div className="border-t border-[hsl(var(--border))] pt-6">
                  <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    Conteúdo do email
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Escolha um modelo salvo ou gere com IA
                  </p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <Label className="text-xs text-[hsl(var(--muted-foreground))]">Modelo salvo</Label>
                      <Select value={selectedModeloId} onValueChange={setSelectedModeloId}>
                        <SelectTrigger className="mt-1.5 w-full sm:max-w-sm">
                          <SelectValue placeholder="Selecionar modelo..." />
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

                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                      <Label className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Gerar com IA
                      </Label>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        {selectedModeloId
                          ? "Com um modelo selecionado acima, a IA edita esse modelo conforme sua instrução. Depois salve na etapa 3 para atualizar o modelo."
                          : "Descreva o que deseja; a IA gera o HTML com logo e cores do sistema."}
                      </p>
                      <textarea
                        rows={3}
                        value={instrucoesIA}
                        onChange={(e) => setInstrucoesIA(e.target.value)}
                        placeholder="Ex: Avisar sobre nova versão, pedir que acessem o painel. Incluir botão 'Acessar painel'."
                        className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                        Variáveis que pode usar no texto: {VARIAVEIS.map((v) => "{{" + v.key + "}}").join(", ")}
                        {filterMode === "missingAnonKey" && (
                          <>, {"{{" + VARIAVEL_LINK_ANON_KEY.key + "}}"}</>
                        )}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={handleGerarEmailIA}
                        disabled={isGeneratingIA || !instrucoesIA.trim()}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isGeneratingIA ? "Gerando..." : "Gerar email"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-[hsl(var(--border))] pt-6">
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canGoToStep2}
                  >
                    Continuar
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 2: Revisar email + assunto + enviar teste */}
            {step === 2 && (
              <div className="space-y-8 p-6 sm:p-8">
                <div>
                  <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    Assunto
                  </h2>
                  <Input
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    placeholder="Assunto do email (use {{nomeSoftware}}, {{email}}, etc.)"
                    className="mt-2"
                  />
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    Variáveis: {VARIAVEIS.map((v) => "{{" + v.key + "}}").join(", ")}
                    {filterMode === "missingAnonKey" && (
                      <>, {"{{" + VARIAVEL_LINK_ANON_KEY.key + "}}"}</>
                    )}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                      Preview do email
                    </h2>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowBodyEditor((b) => !b)}
                    >
                      {showBodyEditor ? "Ocultar editor" : "Editar corpo (HTML)"}
                    </Button>
                  </div>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {recipients.length > 0
                      ? `Preview com dados de: ${previewClient.nomeSoftware}`
                      : "Selecione destinatários na etapa 1"}
                  </p>
                  {showBodyEditor && (
                    <textarea
                      rows={10}
                      value={corpo}
                      onChange={(e) => setCorpo(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="HTML do corpo..."
                    />
                  )}
                  <div className="mt-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-inner">
                    <div className="border-b border-[hsl(var(--border))] px-4 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                      Assunto: {assuntoPreview || "(vazio)"}
                    </div>
                    <div
                      className="max-h-[360px] overflow-auto p-4 text-sm [&_img]:max-w-full"
                      dangerouslySetInnerHTML={{
                        __html: corpoPreview
                          ? corpoPreview.includes("<")
                            ? corpoPreview
                            : "<pre class='whitespace-pre-wrap m-0 font-sans'>" +
                              corpoPreview.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
                              "</pre>"
                          : "<span class='text-[hsl(var(--muted-foreground))]'>(Nenhum conteúdo)</span>",
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4">
                  <Label className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Enviar email de teste
                  </Label>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Envie para um email seu para conferir antes de enviar aos destinatários.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="max-w-[260px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendTest}
                      disabled={
                        isSendingTest ||
                        !testEmail.trim() ||
                        !assunto.trim() ||
                        !corpo.trim()
                      }
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {isSendingTest ? "Enviando..." : "Enviar teste"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between border-t border-[hsl(var(--border))] pt-6">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!canGoToStep3}
                  >
                    Continuar
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 3: Salvar modelo, Enviar agora, Agendar */}
            {step === 3 && (
              <div className="space-y-8 p-6 sm:p-8">
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-4">
                  <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {selectedModeloId ? "Atualizar modelo" : "Salvar como modelo"}
                  </h2>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {selectedModeloId
                      ? "As alterações serão salvas no modelo selecionado. Opcional: informe um novo nome."
                      : "Guarde este email para reutilizar depois."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      placeholder={
                        selectedModeloId
                          ? "Novo nome (opcional, deixe em branco para manter)"
                          : "Nome do modelo (opcional)"
                      }
                      value={modeloNome}
                      onChange={(e) => setModeloNome(e.target.value)}
                      className="max-w-[280px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveModelo}
                      disabled={isSavingModelo || !assunto.trim() || !corpo.trim()}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSavingModelo
                        ? "Salvando..."
                        : selectedModeloId
                          ? "Atualizar modelo"
                          : "Salvar modelo"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    Enviar email agora
                  </h2>
                  <form onSubmit={handleSendNow}>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        recipients.length === 0 ||
                        !assunto.trim() ||
                        !corpo.trim()
                      }
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Enviando..." : "Enviar para " + recipients.length + " destinatário(s)"}
                    </Button>
                  </form>
                </div>

                <div className="rounded-xl border border-[hsl(var(--border))] p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))]">
                    <Calendar className="h-4 w-4" />
                    Agendar envio
                  </h2>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Escolha a data e hora; o backend envia automaticamente na data agendada.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="max-w-[240px]"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAgendar}
                      disabled={
                        isScheduling ||
                        !scheduledAt.trim() ||
                        !assunto.trim() ||
                        !corpo.trim() ||
                        recipients.length === 0
                      }
                    >
                      {isScheduling ? "Agendando..." : "Agendar"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-start border-t border-[hsl(var(--border))] pt-6">
                  <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
