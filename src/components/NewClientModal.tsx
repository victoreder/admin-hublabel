import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const schema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().optional(),
  acessoAtualizacao: z.boolean().optional(),
  nomeSoftware: z.string().optional(),
  dominio: z.string().optional(),
  versao: z.string().optional(),
  urlEvolution: z.string().optional(),
  urlLogo: z.string().optional(),
  telefoneSuporte: z.string().optional(),
  supabase_url: z.string().optional(),
  supabase_anon_key: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface NewClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewClientModal({ open, onClose, onSuccess }: NewClientModalProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { acessoAtualizacao: true },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload: Record<string, unknown> = {
        email: data.email,
        nomeSoftware: (data.nomeSoftware?.trim() || data.email) as string,
        senha: data.senha || null,
        acessoAtualizacao: data.acessoAtualizacao ?? true,
      };
      if (data.dominio) payload.dominio = data.dominio;
      if (data.versao) payload.versao = data.versao;
      if (data.urlEvolution) payload.urlEvolution = data.urlEvolution;
      if (data.urlLogo) payload.urlLogo = data.urlLogo;
      if (data.telefoneSuporte) payload.telefoneSuporte = data.telefoneSuporte;
      if (data.supabase_url) payload.supabase_url = data.supabase_url;
      if (data.supabase_anon_key) payload.supabase_anon_key = data.supabase_anon_key;
      const { error } = await supabase.from("usuarios_SAAS_Agentes").insert(payload);
      if (error) throw error;
      reset();
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar cliente";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} className={errors.email ? "border-destructive" : ""} />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" {...register("senha")} placeholder="Opcional" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="acessoAtualizacao" {...register("acessoAtualizacao")} className="rounded" />
            <Label htmlFor="acessoAtualizacao">Acesso à atualização</Label>
          </div>

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                Mais opções
                <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-4 pt-4 border-t mt-4">
                <div>
                  <Label htmlFor="nomeSoftware">Nome do software</Label>
                  <Input id="nomeSoftware" {...register("nomeSoftware")} />
                </div>
                <div>
                  <Label htmlFor="dominio">Domínio</Label>
                  <Input id="dominio" placeholder="https://..." {...register("dominio")} />
                </div>
                <div>
                  <Label htmlFor="versao">Versão inicial</Label>
                  <Input id="versao" placeholder="1.0.0" {...register("versao")} />
                </div>
                <div>
                  <Label htmlFor="urlEvolution">URL Evolution</Label>
                  <Input id="urlEvolution" {...register("urlEvolution")} />
                </div>
                <div>
                  <Label htmlFor="urlLogo">URL Logo</Label>
                  <Input id="urlLogo" {...register("urlLogo")} />
                </div>
                <div>
                  <Label htmlFor="telefoneSuporte">Telefone Suporte</Label>
                  <Input id="telefoneSuporte" {...register("telefoneSuporte")} />
                </div>
                <div>
                  <Label htmlFor="supabase_url">Supabase URL</Label>
                  <Input id="supabase_url" {...register("supabase_url")} />
                </div>
                <div>
                  <Label htmlFor="supabase_anon_key">Supabase Anon Key</Label>
                  <Input id="supabase_anon_key" {...register("supabase_anon_key")} />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
