const emailLogoUrl = "https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/LOGO.png";
const emailPrimaryColor = "#ffd323";

const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
const LINK_INSTALACOES = FRONTEND_URL ? `${FRONTEND_URL}/admin/instalacoes` : "";

const INSTALACOES_EMAIL_DESTINATARIOS = (() => {
  const raw = process.env.INSTALACOES_EMAIL_DESTINATARIOS;
  if (raw && typeof raw === "string") {
    return raw.split(",").map((e) => e.trim()).filter(Boolean);
  }
  return [
    "financeiro@rxestrategiasdigitais.com.br",
    "viniciusederdasilva@gmail.com",
  ];
})();

function buildEmailShell(innerContentHtml) {
  const logoBlock = emailLogoUrl
    ? `<img src="${emailLogoUrl}" alt="Logo" style="max-width:180px;height:auto;display:block;margin:0 auto;" />`
    : `<span style="font-size:24px;font-weight:700;color:${emailPrimaryColor};letter-spacing:-0.02em;">HubLabel</span>`;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="padding:28px 24px 20px;text-align:center;border-bottom:1px solid #e4e4e7;">${logoBlock}</div>
    <div style="padding:28px 24px;">${innerContentHtml}</div>
    <div style="padding:16px 24px;text-align:center;font-size:12px;color:#71717a;border-top:1px solid #e4e4e7;">HubLabel</div>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEmailNovaInstalacao(telefone, dominio) {
  const tel = escapeHtml(telefone || "—");
  const dom = escapeHtml(dominio || "—");
  const btnHtml = LINK_INSTALACOES
    ? `<p style="margin:28px 0 0 0;"><a href="${LINK_INSTALACOES}" style="display:inline-block;background:${emailPrimaryColor};color:#1c1917;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 2px 8px rgba(255,211,35,0.35);">Ir para Instalações</a></p>`
    : "";
  const inner = `
    <h2 style="color:${emailPrimaryColor};font-size:22px;font-weight:700;margin:0 0 8px 0;letter-spacing:-0.02em;">Nova instalação registrada</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 20px 0;">Uma nova instalação foi cadastrada no painel HubLabel.</p>
    <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid ${emailPrimaryColor};">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:90px;">Domínio</td><td style="padding:6px 0;color:#18181b;font-weight:600;font-size:15px;">${dom}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Telefone</td><td style="padding:6px 0;color:#18181b;font-size:15px;">${tel}</td></tr>
      </table>
    </div>
    ${btnHtml}
  `;
  return buildEmailShell(inner);
}

export function buildEmailInstalacaoFinalizada(telefone, dominio) {
  const tel = escapeHtml(telefone || "—");
  const dom = escapeHtml(dominio || "—");
  const btnHtml = LINK_INSTALACOES
    ? `<p style="margin:28px 0 0 0;"><a href="${LINK_INSTALACOES}" style="display:inline-block;background:${emailPrimaryColor};color:#1c1917;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 2px 8px rgba(255,211,35,0.35);">Ir para Instalações</a></p>`
    : "";
  const inner = `
    <h2 style="color:${emailPrimaryColor};font-size:22px;font-weight:700;margin:0 0 8px 0;letter-spacing:-0.02em;">Instalação finalizada</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 20px 0;">Uma instalação foi concluída e movida para Finalizado no painel.</p>
    <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #22c55e;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:90px;">Domínio</td><td style="padding:6px 0;color:#18181b;font-weight:600;font-size:15px;">${dom}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Telefone</td><td style="padding:6px 0;color:#18181b;font-size:15px;">${tel}</td></tr>
      </table>
    </div>
    ${btnHtml}
  `;
  return buildEmailShell(inner);
}

export function getInstalacoesEmailDestinatarios() {
  return INSTALACOES_EMAIL_DESTINATARIOS;
}

export function getLinkInstalacoes() {
  return LINK_INSTALACOES;
}
