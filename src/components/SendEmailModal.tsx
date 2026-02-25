import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
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
import { getBackendUrl } from "@/lib/utils";
import type { UsuarioSAASAgente } from "@/types/database";

interface SendEmailModalProps {
  open: boolean;
  onClose: () => void;
  clients: UsuarioSAASAgente[];
}

export function SendEmailModal({
  open,
  onClose,
  clients,
}: SendEmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      toast.error("Backend não configurado. Defina VITE_BACKEND_URL.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Informe o assunto.");
      return;
    }
    if (!body.trim()) {
      toast.error("Informe o corpo do email.");
      return;
    }
    if (clients.length === 0) {
      toast.error("Nenhum destinatário selecionado.");
      return;
    }
    const destinatarios = clients
      .map((c) => c.email)
      .filter((e): e is string => typeof e === "string" && e.trim() !== "");
    if (destinatarios.length === 0) {
      toast.error("Nenhum destinatário com email válido.");
      return;
    }
    if (destinatarios.length < clients.length) {
      toast.warning(`${clients.length - destinatarios.length} destinatário(s) sem email foram ignorados.`);
    }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${backendUrl}/api/enviar-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: JSON.stringify({
          destinatarios,
          assunto: subject,
          corpo: body,
        }),
      });
      if (!res.ok) throw new Error("Falha ao enviar");
      toast.success("Email(s) enviado(s) com sucesso!");
      setSubject("");
      setBody("");
      onClose();
    } catch {
      toast.error("Erro ao enviar email. Verifique o Backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar email</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do email"
            />
          </div>
          <div>
            <Label htmlFor="body">Corpo</Label>
            <textarea
              id="body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Conteúdo do email (texto ou HTML)"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {clients.length} destinatário(s) selecionado(s)
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
