import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
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

const BUCKET = "versoes";

const schema = z.object({
  nomeVersao: z.string().min(1, "Versão obrigatória"),
  linkVersao: z.string().optional(),
  correcoes: z.string().optional(),
  implementacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface NewUpdateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewUpdateModal({ open, onClose, onSuccess }: NewUpdateModalProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
      setUploadUrl(urlData.publicUrl);
      setValue("linkVersao", urlData.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload. Verifique se o bucket 'versoes' existe e as políticas de Storage.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeUpload = () => {
    setUploadUrl("");
    setValue("linkVersao", "");
  };

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase.from("versoes_SAAS_Agentes").insert({
        nomeVersao: data.nomeVersao,
        linkVersao: data.linkVersao || uploadUrl || null,
        correcoes: data.correcoes || null,
        implementacoes: data.implementacoes || null,
      });
      if (error) throw error;
      reset();
      setUploadUrl("");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar atualização";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova atualização</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nomeVersao">Número da versão</Label>
            <Input
              id="nomeVersao"
              placeholder="5.2.1"
              {...register("nomeVersao")}
              className={errors.nomeVersao ? "border-destructive" : ""}
            />
            {errors.nomeVersao && (
              <p className="text-sm text-destructive mt-1">{errors.nomeVersao.message}</p>
            )}
          </div>
          <div>
            <Label>Upload de arquivo (Supabase Storage)</Label>
            <div className="flex gap-2 mt-1">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Enviando..." : "Selecionar arquivo"}
              </Button>
              {uploadUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={removeUpload}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {uploadUrl && (
              <p className="text-xs text-muted-foreground mt-1 truncate" title={uploadUrl}>
                URL: {uploadUrl}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="linkVersao">Ou link manual para download</Label>
            <Input id="linkVersao" placeholder="https://..." {...register("linkVersao")} />
          </div>
          <div>
            <Label htmlFor="correcoes">Correções</Label>
            <textarea
              id="correcoes"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Lista de correções..."
              {...register("correcoes")}
            />
          </div>
          <div>
            <Label htmlFor="implementacoes">Implementações</Label>
            <textarea
              id="implementacoes"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Lista de novas funcionalidades..."
              {...register("implementacoes")}
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
