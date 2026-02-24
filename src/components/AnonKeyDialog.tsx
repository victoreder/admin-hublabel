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
import type { UsuarioSAASAgente } from "@/types/database";

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
