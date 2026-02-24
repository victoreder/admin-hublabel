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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import type { UsuarioSAASAgente } from "@/types/database";

function getLinkInserirAnonKey(token: string | undefined): string {
  if (!token) return "";
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/inserir-anon-key?id=${encodeURIComponent(token)}`;
}

interface AnonKeyDialogProps {
  client: UsuarioSAASAgente | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AnonKeyDialog({ client, open, onClose, onSaved }: AnonKeyDialogProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && client) {
      setValue(client.supabase_anon_key?.trim() ?? "");
    }
  }, [open, client]);

  const handleSave = async () => {
    if (!client) return;
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Informe a Anon Key.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("usuarios_SAAS_Agentes")
        .update({ supabase_anon_key: trimmed })
        .eq("id", client.id);
      if (error) throw error;
      toast.success("Anon Key salva com sucesso.");
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showClose>
        <DialogHeader>
          <DialogTitle>Inserir Anon Key</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cliente: <strong className="text-foreground">{client.nomeSoftware || client.email}</strong>
        </p>
        {client.anon_key_token && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <Label className="text-xs text-muted-foreground">Link para o cliente inserir a Anon Key</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={getLinkInserirAnonKey(client.anon_key_token)}
                className="font-mono text-xs flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  const link = getLinkInserirAnonKey(client.anon_key_token);
                  if (link && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(link);
                    toast.success("Link copiado!");
                  }
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Envie este link por email ao cliente para ele colar a Anon Key.
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="anon-key">Supabase Anon Key</Label>
          <Input
            id="anon-key"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
            className="font-mono text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
