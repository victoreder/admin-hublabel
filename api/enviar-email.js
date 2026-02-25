import { getTransporter, fromAddress, fromName } from "./_lib.js";

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
    const { destinatarios, assunto, corpo } = req.body || {};
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(400).json({ error: "destinatarios é obrigatório e deve ser um array não vazio." });
    }
    if (!assunto || typeof assunto !== "string") {
      return res.status(400).json({ error: "assunto é obrigatório." });
    }
    if (!corpo || typeof corpo !== "string") {
      return res.status(400).json({ error: "corpo é obrigatório." });
    }
    const transporter = getTransporter();
    const results = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: destinatarios,
      subject: assunto,
      text: corpo.replace(/<[^>]*>/g, ""),
      html: corpo.includes("<") ? corpo : undefined,
    });
    res.status(200).json({ success: true, message: "Email(s) enviado(s) com sucesso.", messageId: results.messageId });
  } catch (err) {
    console.error("Erro ao enviar email.");
    res.status(500).json({ error: "Falha ao enviar email." });
  }
}
