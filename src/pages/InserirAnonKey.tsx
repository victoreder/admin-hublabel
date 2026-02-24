import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VIDEO_URL = import.meta.env.VITE_VIDEO_ANON_KEY ?? "";
const LOGO_URL = "https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/LOGO.png";

interface ClientInfo {
  nomeSoftware: string;
  dominio: string;
}

export function InserirAnonKey() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("id")?.trim() ?? "";
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(!!token);
  const [anonKey, setAnonKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) {
      setLoadingInfo(false);
      return;
    }
    fetch(`${backendUrl}/api/inserir-anon-key-info?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((err) => Promise.reject(err));
        return res.json();
      })
      .then((data) => {
        const nome = data?.nomeSoftware ?? data?.nome_software ?? "";
        const dominio = data?.dominio ?? "";
        setClientInfo({ nomeSoftware: String(nome), dominio: String(dominio) });
      })
      .catch(() => {
        setClientInfo(null);
      })
      .finally(() => setLoadingInfo(false));
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Link inválido. Use o link enviado por email.");
      return;
    }
    const trimmed = anonKey.trim();
    if (!trimmed) {
      toast.error("Informe a Anon Key.");
      return;
    }
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) {
      toast.error("Serviço não configurado. Entre em contato com o suporte.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/salvar-anon-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, anon_key: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Anon Key salva com sucesso!");
      setAnonKey("");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <img src={LOGO_URL} alt="Logo" className="h-10 w-auto object-contain" />
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Link inválido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use o link que foi enviado por email para inserir sua Anon Key. Se o problema
                persistir, entre em contato com o suporte.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">
        <img src={LOGO_URL} alt="Logo" className="h-10 w-auto object-contain" />
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle>Inserir Anon Key</CardTitle>
            {loadingInfo && (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}
            {!loadingInfo && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">
                  {clientInfo?.nomeSoftware || "Seu sistema"}
                </p>
                <p className="text-muted-foreground">
                  Domínio: {clientInfo?.dominio || "—"}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground pt-1">
              Cole abaixo a Supabase Anon Key do seu projeto, conforme as instruções.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
          {VIDEO_URL && (
            <div className="aspect-video rounded-lg border border-input overflow-hidden bg-muted">
              <iframe
                title="Instruções para obter a Anon Key"
                src={VIDEO_URL}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anon-key">Supabase Anon Key</Label>
              <Input
                id="anon-key"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
