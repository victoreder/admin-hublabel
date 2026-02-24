import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { VersaoSAASAgente } from "@/types/database";

const LOGO_URL = "https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/LOGO.png";

export function ChangelogPublic() {
  const [updates, setUpdates] = useState<VersaoSAASAgente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("versoes_SAAS_Agentes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error) setUpdates((data as VersaoSAASAgente[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border py-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="container max-w-3xl mx-auto px-4 flex items-center gap-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <img src={LOGO_URL} alt="Logo" className="h-10 w-auto object-contain" />
          <h1 className="text-xl font-bold">Atualizações</h1>
        </div>
      </header>
      <main className="container max-w-3xl mx-auto px-4 py-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Nenhuma atualização publicada.</p>
        ) : (
          <div className="space-y-6">
            {updates.map((u) => (
              <Card key={u.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-lg">Versão {u.nomeVersao}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {u.created_at
                        ? format(new Date(u.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : ""}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {u.implementacoes && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Implementações</h4>
                      <p className="text-sm whitespace-pre-wrap">{u.implementacoes}</p>
                    </div>
                  )}
                  {u.correcoes && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Correções</h4>
                      <p className="text-sm whitespace-pre-wrap">{u.correcoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
