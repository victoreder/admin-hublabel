import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Sparkles } from "lucide-react";
import type { VersaoSAASAgente } from "@/types/database";

const LOGO_URL = "https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/LOGO.png";

function bulletLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function firstLineSummary(u: VersaoSAASAgente): string | null {
  if (u.titulo) return u.titulo;
  const impl = u.implementacoes && bulletLines(u.implementacoes)[0];
  if (impl) return impl;
  const corr = u.correcoes && bulletLines(u.correcoes)[0];
  return corr || null;
}

interface VersionBlockProps {
  u: VersaoSAASAgente;
  isLatest?: boolean;
}

function VersionBlock({ u, isLatest }: VersionBlockProps) {
  return (
    <article
      id={isLatest ? "ultima-versao" : undefined}
      className={`grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-8 md:gap-x-12 gap-y-4 md:pt-0.5 ${
        isLatest
          ? "rounded-xl border-2 border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 p-6 md:p-6"
          : "border-b border-[hsl(var(--border))] pb-8 last:border-0 last:pb-0"
      }`}
    >
      <div className="md:pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
            Versão {u.nomeVersao}
          </h2>
          {isLatest && (
            <Badge variant="default" className="shrink-0 text-xs">
              <Sparkles className="h-3 w-3 mr-1" aria-hidden />
              Mais recente
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          {u.created_at
            ? format(new Date(u.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })
            : ""}
        </p>
      </div>
      <div className="min-w-0 space-y-4">
        {u.titulo && (
          <h3 className="text-lg font-semibold tracking-tight text-[hsl(var(--foreground))]">
            {u.titulo}
          </h3>
        )}
        <div className="space-y-5">
          {u.implementacoes && bulletLines(u.implementacoes).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2">
                Novidades
              </h4>
              <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] leading-relaxed text-[hsl(var(--foreground))] marker:text-[hsl(var(--muted-foreground))]">
                {bulletLines(u.implementacoes).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {u.correcoes && bulletLines(u.correcoes).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2">
                Correções e melhorias
              </h4>
              <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] leading-relaxed text-[hsl(var(--foreground))] marker:text-[hsl(var(--muted-foreground))]">
                {bulletLines(u.correcoes).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {u.url_imagem && (
          <div className="mt-4">
            <img
              src={u.url_imagem}
              alt=""
              className="w-full max-w-xl rounded-lg border border-[hsl(var(--border))] object-cover shadow-sm"
            />
          </div>
        )}
        {u.linkVersao && (
          <a
            href={u.linkVersao}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--primary))] hover:underline"
          >
            {u.titulo ? "Leia mais" : "Baixar versão"}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}

/** Changelog público: destaque para última versão, fácil leitura do que foi feito */
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

  const [latest, ...previous] = updates;
  const latestSummary = latest ? firstLineSummary(latest) : null;

  return (
    <div
      className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
      data-changelog-light
    >
      <header className="border-b border-[hsl(var(--border))] py-8 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="container max-w-2xl mx-auto px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-4 mb-6">
            <img src={LOGO_URL} alt="Logo" className="h-9 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Changelog
          </h1>
          <p className="mt-1 text-[15px] text-[hsl(var(--muted-foreground))]">
            As últimas atualizações e melhorias.
          </p>
          {!loading && latest && (
            <div className="mt-6 rounded-lg bg-[hsl(var(--muted))] px-4 py-3 border border-[hsl(var(--border))]">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Última versão: <span className="font-semibold">{latest.nomeVersao}</span>
                {latestSummary && (
                  <span className="block mt-1 font-normal text-[hsl(var(--muted-foreground))]">
                    {latestSummary}
                  </span>
                )}
              </p>
            </div>
          )}
          <div className="mt-6 h-px w-full bg-[hsl(var(--border))]" aria-hidden />
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-10 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="space-y-10">
            <div className="rounded-xl border-2 border-[hsl(var(--border))] p-6">
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-8 gap-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-40 w-full max-w-xl rounded-lg" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-8 gap-y-4 pb-8">
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          </div>
        ) : updates.length === 0 ? (
          <p className="py-16 text-[15px] text-[hsl(var(--muted-foreground))]">
            Nenhuma atualização publicada.
          </p>
        ) : (
          <div className="space-y-10">
            {latest && (
              <section aria-labelledby="heading-ultima">
                <h2 id="heading-ultima" className="sr-only">
                  O que há de novo
                </h2>
                <VersionBlock u={latest} isLatest />
              </section>
            )}
            {previous.length > 0 && (
              <section className="space-y-0" aria-labelledby="heading-histórico">
                <h2
                  id="heading-histórico"
                  className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-6 pb-2 border-b border-[hsl(var(--border))]"
                >
                  Versões anteriores
                </h2>
                <div className="space-y-0">
                  {previous.map((u) => (
                    <VersionBlock key={u.id} u={u} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
