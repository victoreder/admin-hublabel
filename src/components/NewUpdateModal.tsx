import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload, X, ImageIcon, Download, Plus, ChevronRight } from "lucide-react";
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

const BUCKET = "versoes";

/** Parse "5.2.3", "V5.2.2" ou "5" em { major, minor, patch } (remove prefixo V/v) */
function parseVersion(str: string): { major: number; minor: number; patch: number } {
  const raw = String(str || "0").trim().replace(/^[Vv]\s*/i, "");
  const parts = raw.split(".").map((p) => parseInt(p.trim(), 10) || 0);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  };
}

/** Próxima versão: patch (5.2.3→5.2.4), minor (5.2.3→5.3.0), major (5.2.3→6.0.0) */
function nextVersion(last: string, type: "patch" | "minor" | "major"): string {
  const v = parseVersion(last);
  if (type === "patch") return `${v.major}.${v.minor}.${v.patch + 1}`;
  if (type === "minor") return `${v.major}.${v.minor + 1}.0`;
  return `${v.major + 1}.0.0`;
}

/** Foca o próximo elemento focável (comportamento de Tab) */
function focusNextFocusable(container: HTMLElement) {
  const selector = "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])";
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.tabIndex >= 0 || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "BUTTON" || el.tagName === "SELECT" || el.getAttribute("href")
  );
  const current = document.activeElement as HTMLElement | null;
  const idx = current ? focusable.indexOf(current) : -1;
  const next = focusable[idx + 1] ?? focusable[0];
  if (next) next.focus();
}

const schema = z.object({
  nomeVersao: z.string().min(1, "Versão obrigatória"),
  titulo: z.string().optional(),
  linkVersao: z.string().optional(),
  url_imagem: z.string().optional(),
  correcoes: z.string().optional(),
  implementacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface NewUpdateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { n: 1, title: "Versão e título" },
  { n: 2, title: "Link (n8n ou upload)" },
  { n: 3, title: "Implementações" },
  { n: 4, title: "Correções" },
  { n: 5, title: "Imagem" },
] as const;

export function NewUpdateModal({ open, onClose, onSuccess }: NewUpdateModalProps) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [loadingN8n, setLoadingN8n] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [implementacoesList, setImplementacoesList] = useState<string[]>([""]);
  const [correcoesList, setCorrecoesList] = useState<string[]>([""]);
  const [lastVersion, setLastVersion] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const resetStepAndLists = () => {
    setStep(1);
    setImplementacoesList([""]);
    setCorrecoesList([""]);
  };

  const handleClose = () => {
    onClose();
    resetStepAndLists();
  };

  useEffect(() => {
    if (open) {
      resetStepAndLists();
      (async () => {
        const { data, error } = await supabase
          .from("versoes_SAAS_Agentes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data && typeof data === "object") {
          const row = data as Record<string, unknown>;
          const v = row.nomeVersao;
          if (v != null && String(v).trim() !== "") {
            const ver = String(v).trim();
            setLastVersion(ver);
            setValue("nomeVersao", ver);
          } else setLastVersion(null);
        } else setLastVersion(null);
      })();
    }
  }, [open]);

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

  const handlePullFromN8n = async () => {
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      toast.error("Backend não configurado. Defina VITE_BACKEND_URL.");
      return;
    }
    const version = getValues("nomeVersao")?.trim() || "0.0.0";
    setLoadingN8n(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/n8n/workflow-link?version=${encodeURIComponent(version)}`
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao puxar do n8n.");
        return;
      }
      if (data.link) {
        setUploadUrl(data.link);
        setValue("linkVersao", data.link);
      }
      if (data.savedFileUrl) {
        toast.success(
          data.savedFileName
            ? `Workflow salvo: ${data.savedFileName}`
            : "Workflow salvo no Storage."
        );
      } else if (!data.link) {
        toast.info("Nenhum link encontrado no workflow.");
      }
    } catch {
      toast.error("Falha ao conectar com o backend.");
    } finally {
      setLoadingN8n(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const path = `changelog/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
      setImageUrl(urlData.publicUrl);
      setValue("url_imagem", urlData.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload da imagem.");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setImageUrl("");
    setValue("url_imagem", "");
  };

  const ensureVersionWithV = (v: string) => (/^v/i.test(v.trim()) ? v.trim() : `V${v.trim()}`);

  const onSubmit = async (data: FormData) => {
    try {
      const correcoesStr = correcoesList.filter(Boolean).join("\n") || null;
      const implementacoesStr = implementacoesList.filter(Boolean).join("\n") || null;
      const { error } = await supabase.from("versoes_SAAS_Agentes").insert({
        nomeVersao: ensureVersionWithV(data.nomeVersao),
        titulo: data.titulo || null,
        linkVersao: data.linkVersao || uploadUrl || null,
        url_imagem: data.url_imagem || imageUrl || null,
        correcoes: correcoesStr,
        implementacoes: implementacoesStr,
      });
      if (error) throw error;
      reset();
      setUploadUrl("");
      setImageUrl("");
      resetStepAndLists();
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao registrar atualização";
      toast.error(msg);
    }
  };

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, ""]);
  };
  const updateListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : [""]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova atualização</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Etapa {step} de 5 — {STEPS[step - 1].title}
          </p>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const target = e.target as HTMLElement;
            if (target.tagName === "TEXTAREA") return;
            e.preventDefault();
            focusNextFocusable(e.currentTarget);
          }}
        >
          {/* Etapa 1: Número da versão e título (para nomenclatura do arquivo no n8n) */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Tipo de atualização</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  {lastVersion != null ? (
                    <>Última versão no sistema: <span className="font-medium text-foreground">{lastVersion}</span></>
                  ) : (
                    "Carregando última versão… ou digite abaixo (ex.: 1.0.0)."
                  )}
                </p>
                {(() => {
                  const base = getValues("nomeVersao")?.trim() || lastVersion || "0.0.0";
                  return (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValue("nomeVersao", nextVersion(base, "patch"))}
                      >
                        Correção → {nextVersion(base, "patch")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValue("nomeVersao", nextVersion(base, "minor"))}
                      >
                        Feature simples → {nextVersion(base, "minor")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValue("nomeVersao", nextVersion(base, "major"))}
                      >
                        Feature grande → {nextVersion(base, "major")}
                      </Button>
                    </div>
                  );
                })()}
              </div>
              <div>
                <Label htmlFor="nomeVersao">Número da versão</Label>
                <Input
                  id="nomeVersao"
                  placeholder="5.2.1"
                  {...register("nomeVersao")}
                  className={`mt-1 ${errors.nomeVersao ? "border-destructive" : ""}`}
                />
                {errors.nomeVersao && (
                  <p className="text-sm text-destructive mt-1">{errors.nomeVersao.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Usado na nomenclatura do arquivo ao puxar do n8n (ex.: HUBLABEL-5.2.1-24feb.json). Pode editar após escolher o tipo.
                </p>
              </div>
              <div>
                <Label htmlFor="titulo">Título da entrada (opcional)</Label>
                <Input
                  id="titulo"
                  placeholder="Ex.: Colar itens na ordem em que foram copiados"
                  {...register("titulo")}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Título principal exibido no changelog ao lado da versão.
                </p>
              </div>
            </div>
          )}

          {/* Etapa 2: Puxar do n8n e upload */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  className="flex-1 bg-[#EB5176] hover:bg-[#d9476a] text-white border-0 shadow-md focus-visible:ring-2 focus-visible:ring-[#EB5176] focus-visible:ring-offset-2 h-11"
                  onClick={handlePullFromN8n}
                  disabled={loadingN8n}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {loadingN8n ? "Puxando..." : "Puxar do n8n"}
                </Button>
                <div className="flex items-center gap-1.5 flex-1">
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
                    size="sm"
                    className="h-11 flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Enviando..." : "Upload de arquivo"}
                  </Button>
                  {uploadUrl && (
                    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={removeUpload}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {uploadUrl && (
                <p className="text-xs text-muted-foreground break-all rounded-md bg-muted/50 px-3 py-2" title={uploadUrl}>
                  {uploadUrl}
                </p>
              )}
            </div>
          )}

          {/* Etapa 3: Implementações — uma linha + botão + */}
          {step === 3 && (
            <div className="space-y-2">
              <Label>Implementações</Label>
              <p className="text-xs text-muted-foreground mb-2">Uma novidade por linha no changelog.</p>
              {implementacoesList.map((value, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Nova implementação..."
                    value={value}
                    onChange={(e) => updateListItem(setImplementacoesList, index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeListItem(setImplementacoesList, index)}
                    title="Remover"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => addListItem(setImplementacoesList)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          )}

          {/* Etapa 4: Correções — uma linha + botão + */}
          {step === 4 && (
            <div className="space-y-2">
              <Label>Correções</Label>
              <p className="text-xs text-muted-foreground mb-2">Uma correção por linha no changelog.</p>
              {correcoesList.map((value, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Nova correção..."
                    value={value}
                    onChange={(e) => updateListItem(setCorrecoesList, index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeListItem(setCorrecoesList, index)}
                    title="Remover"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => addListItem(setCorrecoesList)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          )}

          {/* Etapa 5: Imagem (pode pular) */}
          {step === 5 && (
            <div className="space-y-4">
              <Label>Imagem do changelog (opcional)</Label>
              <p className="text-xs text-muted-foreground">Você pode pular esta etapa e salvar sem imagem.</p>
              <div className="flex gap-2 flex-wrap items-center">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={uploadingImg}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImg}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {uploadingImg ? "Enviando..." : "Enviar imagem"}
                </Button>
                {imageUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
                    <X className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                )}
                <Input
                  placeholder="Ou cole a URL da imagem"
                  {...register("url_imagem")}
                  className={`flex-1 min-w-[180px] ${imageUrl ? "opacity-60" : ""}`}
                  onChange={(e) => {
                    register("url_imagem").onChange(e);
                    if (!e.target.value) setImageUrl("");
                  }}
                />
              </div>
              {imageUrl && (
                <p className="text-xs text-muted-foreground truncate" title={imageUrl}>
                  {imageUrl}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="border-t pt-4 flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {step < 5 ? (
              <>
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                    Voltar
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={
                    (step === 1 && !getValues("nomeVersao")?.trim()) ||
                    (step === 2 && !uploadUrl)
                  }
                >
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
