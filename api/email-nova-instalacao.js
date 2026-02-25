import { getTransporter, fromAddress, fromName } from "./_lib.js";
import { buildEmailNovaInstalacao, getInstalacoesEmailDestinatarios, getLinkInstalacoes } from "./instalacoes-email-lib.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { telefone, dominio } = req.body || {};
    const dominioStr = dominio != null ? String(dominio).trim() : "";
    const transporter = getTransporter();
    const html = buildEmailNovaInstalacao(telefone, dominioStr);
    const linkInstalacoes = getLinkInstalacoes();
    const to = getInstalacoesEmailDestinatarios();
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject: "HubLabel – Nova instalação registrada",
      text: `Nova instalação: Domínio ${dominioStr || "—"}, Telefone ${telefone || "—"}. ${linkInstalacoes ? "Acesse: " + linkInstalacoes : ""}`,
      html,
    });
    res.status(200).json({ success: true, message: "Email de nova instalação enviado." });
  } catch (err) {
    console.error("Erro ao enviar email nova instalação:", err);
    res.status(500).json({ error: "Falha ao enviar email." });
  }
}
