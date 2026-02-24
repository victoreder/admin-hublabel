import type { UsuarioSAASAgente } from "@/types/database";

/**
 * Extrai o domínio base (sem "app." na frente) para usar nos acessos.
 */
export function getBaseDomain(dominio: string | undefined | null): string {
  if (!dominio?.trim()) return "";
  let host = dominio.trim();
  try {
    if (!host.startsWith("http")) host = "https://" + host;
    const url = new URL(host);
    host = url.hostname;
  } catch {
    // já é só hostname
  }
  return host.replace(/^app\./i, "");
}

export interface AccessBlock {
  title: string;
  items: { label: string; value: string }[];
}

export interface AccessData {
  base: string;
  n8n: AccessBlock;
  portainer: AccessBlock;
  app: AccessBlock;
  painelAdmin: AccessBlock;
  evolution: AccessBlock | null;
}

export function getAccessData(client: UsuarioSAASAgente): AccessData {
  const base = getBaseDomain(client.dominio);
  const MUDAR = base || "(domínio não informado)";

  return {
    base: MUDAR,
    n8n: {
      title: "n8n",
      items: [
        { label: "URL n8n", value: `https://back.${MUDAR}/home/workflows` },
        { label: "Email", value: `suporte@${MUDAR}` },
        { label: "Senha", value: "EjGse3_0@t50OPo" },
      ],
    },
    portainer: {
      title: "Portainer",
      items: [
        { label: "URL", value: `painel.${MUDAR}` },
        { label: "Login", value: "admin" },
        { label: "Senha", value: "EjGse3_0@t50OPo" },
      ],
    },
    app: {
      title: "Aplicativo",
      items: [
        { label: "URL", value: `app.${MUDAR}/login` },
      ],
    },
    painelAdmin: {
      title: "Painel de Administração",
      items: [
        { label: "URL", value: `app.${MUDAR}/acesso-admin` },
        { label: "Login", value: "admin" },
        { label: "Senha", value: "EjGse3_0@t50OPo" },
      ],
    },
    evolution:
      client.urlEvolution || client.apiEvolution
        ? {
            title: "Evolution",
            items: [
              ...(client.urlEvolution ? [{ label: "URL Evolution", value: client.urlEvolution }] : []),
              ...(client.apiEvolution ? [{ label: "API Key Evolution", value: client.apiEvolution }] : []),
            ],
          }
        : null,
  };
}

/**
 * Texto plano para copiar (compatível com o formato original).
 */
export function buildAccessText(client: UsuarioSAASAgente): string {
  const d = getAccessData(client);
  const lines: string[] = ["*INSTALAÇÃO COMPLETA*", ""];
  [d.n8n, d.portainer, d.app, d.painelAdmin].forEach((block) => {
    lines.push(`* *${block.title}*`);
    block.items.forEach(({ label, value }) => lines.push(`* ${label}: ${value}`));
    lines.push("");
  });
  if (d.evolution) {
    lines.push(`* *${d.evolution.title}*`);
    d.evolution.items.forEach(({ label, value }) => lines.push(`* ${label}: ${value}`));
  }
  return lines.join("\n").trim();
}
