import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Pencil } from "lucide-react";
import type { UsuarioSAASAgente } from "@/types/database";

interface ClientDetailsProps {
  client: UsuarioSAASAgente | null;
  open: boolean;
  onClose: () => void;
  onClientUpdated?: () => void;
}

function isUrl(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  return v.startsWith("http://") || v.startsWith("https://") || /^[\w.-]+\.[\w.-]+/.test(v);
}

function toHref(value: string): string {
  const v = value.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return "https://" + v;
}

function Field({
  label,
  value,
  mono,
  link,
  onEdit,
  fieldKey,
}: {
  label: string;
  value: string | undefined | null;
  mono?: boolean;
  link?: boolean;
  onEdit?: (key: string, label: string) => void;
  fieldKey?: string;
}) {
  const v = value ?? "-";
  const asLink = link && isUrl(value);
  const editable = onEdit && fieldKey;
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-border/60 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {editable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onEdit(fieldKey, label)}
            title={`Editar ${label}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {asLink ? (
        <a
          href={toHref(value!)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1 w-fit"
        >
          {v}
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      ) : (
        <span className={`text-sm ${mono ? "font-mono text-muted-foreground break-all" : ""}`}>{v}</span>
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  fieldKey,
  onEdit,
}: {
  label: string;
  value: string;
  fieldKey: string;
  onEdit: (key: string, label: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-border/60 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => onEdit(fieldKey, label)}
          title={`Editar ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-md border shrink-0" style={{ backgroundColor: value }} />
        <span className="text-sm font-mono">{value}</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="space-y-0 rounded-lg bg-muted/40 p-3">{children}</div>
    </section>
  );
}

type EditableKey = keyof Pick<
  UsuarioSAASAgente,
  | "nomeSoftware"
  | "email"
  | "dominio"
  | "versao"
  | "telefoneSuporte"
  | "acessoAtualizacao"
  | "atualizacoes_automaticas"
  | "urlEvolution"
  | "apiEvolution"
  | "n8nUrl"
  | "supabase_url"
  | "supabase_apikey"
  | "supabase_anon_key"
  | "corPrincipal"
  | "corSecundaria"
  | "urlLogo"
  | "urlFavicon"
  | "senha"
>;

export function ClientDetails({ client, open, onClose, onClientUpdated }: ClientDetailsProps) {
  const [localClient, setLocalClient] = useState<UsuarioSAASAgente | null>(client);
  const [editing, setEditing] = useState<{ key: EditableKey; label: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && client) setLocalClient(client);
  }, [open, client]);

  useEffect(() => {
    if (!editing || !localClient) return;
    const k = editing.key;
    if (k === "acessoAtualizacao" || k === "atualizacoes_automaticas") {
      const val = localClient[k];
      setEditValue(val ? "true" : "false");
    } else {
      const v = localClient[k];
      setEditValue(typeof v === "string" ? v : v != null ? String(v) : "");
    }
  }, [editing, localClient]);

  const handleSaveEdit = async () => {
    if (!editing || !localClient) return;
    const key = editing.key;
    setSaving(true);
    try {
      let payload: Record<string, unknown> = {};
      if (key === "acessoAtualizacao") {
        payload.acessoAtualizacao = editValue === "true";
      } else if (key === "atualizacoes_automaticas") {
        payload.atualizacoes_automaticas = editValue === "true";
      } else if (key === "senha") {
        if (!editValue.trim()) {
          setEditing(null);
          return;
        }
        payload.senha = editValue.trim();
      } else {
        payload[key] = editValue.trim() || null;
      }
      const { error } = await supabase
        .from("usuarios_SAAS_Agentes")
        .update(payload)
        .eq("id", localClient.id);
      if (error) throw error;
      setLocalClient((prev) => (prev ? { ...prev, ...payload } : null));
      onClientUpdated?.();
      setEditing(null);
      toast.success("Salvo com sucesso.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!localClient) return null;

  const hasSupabase = localClient.supabase_url || localClient.supabase_apikey || localClient.supabase_anon_key;
  const hasEvolution = localClient.urlEvolution || localClient.apiEvolution;
  const hasAparência = localClient.corPrincipal || localClient.corSecundaria || localClient.urlLogo || localClient.urlFavicon;

  const openEdit = (key: string, label: string) => setEditing({ key: key as EditableKey, label });

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent showClose className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do cliente
              {localClient.nomeSoftware && (
                <Badge variant="secondary" className="font-normal">
                  {localClient.nomeSoftware}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            <Section title="Identificação">
              <Field label="ID" value={localClient.id} mono />
              <Field label="Nome do software" value={localClient.nomeSoftware} onEdit={openEdit} fieldKey="nomeSoftware" />
              <Field label="Email" value={localClient.email} onEdit={openEdit} fieldKey="email" />
              <Field label="Domínio" value={localClient.dominio} link onEdit={openEdit} fieldKey="dominio" />
              <Field label="Versão" value={localClient.versao} onEdit={openEdit} fieldKey="versao" />
              <Field label="Telefone suporte" value={localClient.telefoneSuporte} onEdit={openEdit} fieldKey="telefoneSuporte" />
              <Field
                label="Acesso à atualização"
                value={localClient.acessoAtualizacao != null ? (localClient.acessoAtualizacao ? "Sim" : "Não") : undefined}
                onEdit={openEdit}
                fieldKey="acessoAtualizacao"
              />
              <Field
                label="Atualizações automáticas"
                value={localClient.atualizacoes_automaticas === false ? "Não" : "Sim"}
                onEdit={openEdit}
                fieldKey="atualizacoes_automaticas"
              />
            </Section>

            {(hasEvolution || localClient.n8nUrl) && (
              <Section title="Integrações">
                {localClient.urlEvolution && <Field label="URL Evolution" value={localClient.urlEvolution} link onEdit={openEdit} fieldKey="urlEvolution" />}
                {localClient.apiEvolution && <Field label="API Key Evolution" value={localClient.apiEvolution} mono onEdit={openEdit} fieldKey="apiEvolution" />}
                {localClient.n8nUrl && <Field label="URL n8n" value={localClient.n8nUrl} link onEdit={openEdit} fieldKey="n8nUrl" />}
              </Section>
            )}

            {hasSupabase && (
              <Section title="Supabase">
                {localClient.supabase_url && <Field label="URL" value={localClient.supabase_url} link onEdit={openEdit} fieldKey="supabase_url" />}
                {localClient.supabase_apikey && <Field label="API Key" value={localClient.supabase_apikey} mono onEdit={openEdit} fieldKey="supabase_apikey" />}
                {localClient.supabase_anon_key && <Field label="Anon Key" value={localClient.supabase_anon_key} mono onEdit={openEdit} fieldKey="supabase_anon_key" />}
              </Section>
            )}

            {hasAparência && (
              <Section title="Aparência">
                {localClient.corPrincipal && <ColorField label="Cor principal" value={localClient.corPrincipal} fieldKey="corPrincipal" onEdit={openEdit} />}
                {localClient.corSecundaria && <ColorField label="Cor secundária" value={localClient.corSecundaria} fieldKey="corSecundaria" onEdit={openEdit} />}
                {localClient.urlLogo && <Field label="URL logo" value={localClient.urlLogo} link onEdit={openEdit} fieldKey="urlLogo" />}
                {localClient.urlFavicon && <Field label="URL favicon" value={localClient.urlFavicon} link onEdit={openEdit} fieldKey="urlFavicon" />}
              </Section>
            )}

            {(localClient.senha != null && localClient.senha !== "") && (
              <Section title="Outros">
                <Field label="Senha" value="••••••••" onEdit={openEdit} fieldKey="senha" />
              </Section>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent showClose>
          <DialogHeader>
            <DialogTitle>Editar {editing?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {(editing?.key === "acessoAtualizacao" || editing?.key === "atualizacoes_automaticas") ? (
              <>
                <Label>{editing.label}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={editValue === "true" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditValue("true")}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={editValue === "false" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditValue("false")}
                  >
                    Não
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Label htmlFor="edit-field">{editing?.label}</Label>
                <Input
                  id="edit-field"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={editing?.key === "senha" ? "Nova senha (deixe vazio para não alterar)" : undefined}
                  type={editing?.key === "senha" ? "password" : "text"}
                  className={editing?.key === "senha" ? "" : "font-mono"}
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
