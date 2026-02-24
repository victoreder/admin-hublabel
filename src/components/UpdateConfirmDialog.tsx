import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, Smartphone } from "lucide-react";
import type { UsuarioSAASAgente } from "@/types/database";

export type UpdateType = "tudo" | "sql" | "app";

interface UpdateConfirmDialogProps {
  client: UsuarioSAASAgente | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (client: UsuarioSAASAgente, tipo: UpdateType) => void;
  loading?: boolean;
}

export function UpdateConfirmDialog({
  client,
  open,
  onClose,
  onConfirm,
  loading = false,
}: UpdateConfirmDialogProps) {
  if (!client) return null;

  const nome = client.nomeSoftware || client.email || "Cliente";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showClose>
        <DialogHeader>
          <DialogTitle>Confirmar atualização</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Deseja confirmar a atualização para <strong className="text-foreground">{nome}</strong>? Escolha o tipo:
        </p>
        <div className="flex flex-col gap-2 py-2">
          <Button
            variant="default"
            className="w-full justify-start gap-2"
            onClick={() => onConfirm(client, "tudo")}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar tudo
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => onConfirm(client, "sql")}
            disabled={loading}
          >
            <Database className="h-4 w-4" />
            Atualizar SQL
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => onConfirm(client, "app")}
            disabled={loading}
          >
            <Smartphone className="h-4 w-4" />
            Atualizar app
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
