import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { VersaoSAASAgente } from "@/types/database";

const schema = z.object({
  nomeVersao: z.string().min(1, "Versão obrigatória"),
  titulo: z.string().optional(),
  linkVersao: z.string().optional(),
  url_imagem: z.string().optional(),
  correcoes: z.string().optional(),
  implementacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EditUpdateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  update: VersaoSAASAgente | null;
}

export function EditUpdateModal({ open, onClose, onSuccess, update }: EditUpdateModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open && update) {
      reset({
        nomeVersao: update.nomeVersao ?? "",
        titulo: update.titulo ?? "",
        linkVersao: update.linkVersao ?? "",
        url_imagem: update.url_imagem ?? "",
        correcoes: update.correcoes ?? "",
        implementacoes: update.implementacoes ?? "",
      });
    }
  }, [open, update, reset]);

  const ensureVersionWithV = (v: string) => (/^v/i.test(v.trim()) ? v.trim() : `V${v.trim()}`);

  const onSubmit = async (data: FormData) => {
    if (!update?.id) return;
    try {
      const { error } = await supabase
        .from("versoes_SAAS_Agentes")
        .update({
          nomeVersao: ensureVersionWithV(data.nomeVersao),
          titulo: data.titulo || null,
          linkVersao: data.linkVersao || null,
          url_imagem: data.url_imagem || null,
          correcoes: data.correcoes || null,
          implementacoes: data.implementacoes || null,
        })
        .eq("id", update.id);
      if (error) throw error;
      onSuccess();
      onClose();
      toast.success("Atualização alterada.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar alterações";
      toast.error(msg);
    }
  };

  if (!update) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar atualização</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="edit-nomeVersao">Número da versão</Label>
            <Input
              id="edit-nomeVersao"
              placeholder="5.2.1"
              {...register("nomeVersao")}
              className={errors.nomeVersao ? "border-destructive" : ""}
            />
            {errors.nomeVersao && (
              <p className="text-sm text-destructive mt-1">{errors.nomeVersao.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="edit-titulo">Título (opcional)</Label>
            <Input id="edit-titulo" placeholder="Título da entrada" {...register("titulo")} />
          </div>
          <div>
            <Label htmlFor="edit-linkVersao">Link para download</Label>
            <Input id="edit-linkVersao" placeholder="https://..." {...register("linkVersao")} />
          </div>
          <div>
            <Label htmlFor="edit-url_imagem">URL da imagem (opcional)</Label>
            <Input id="edit-url_imagem" placeholder="https://..." {...register("url_imagem")} />
          </div>
          <div>
            <Label htmlFor="edit-implementacoes">Implementações</Label>
            <textarea
              id="edit-implementacoes"
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Uma por linha"
              {...register("implementacoes")}
            />
          </div>
          <div>
            <Label htmlFor="edit-correcoes">Correções</Label>
            <textarea
              id="edit-correcoes"
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Uma por linha"
              {...register("correcoes")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
