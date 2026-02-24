import "dotenv/config";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_KEY,
  SMTP_FROM_EMAIL,
  SMTP_FROM_NAME,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

let supabaseClient = null;
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env do backend.");
  }
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseClient;
}

function getTransporter() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_KEY) {
    throw new Error(
      "Configure SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_KEY no .env do backend."
    );
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_KEY,
    },
  });
}

const fromAddress = SMTP_FROM_EMAIL || "naoresponda@hublabel.com.br";
const fromName = SMTP_FROM_NAME || "HubLabel";

app.post("/api/enviar-email", async (req, res) => {
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

    res.status(200).json({
      success: true,
      message: "Email(s) enviado(s) com sucesso.",
      messageId: results.messageId,
    });
  } catch (err) {
    console.error("Erro ao enviar email.");
    res.status(500).json({
      error: "Falha ao enviar email.",
    });
  }
});

// Service role bypassa RLS: este endpoint lê nomeSoftware e dominio pelo token.
app.get("/api/inserir-anon-key-info", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "token é obrigatório." });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("usuarios_SAAS_Agentes")
      .select("nomeSoftware, dominio")
      .eq("anon_key_token", token)
      .maybeSingle();
    if (error) {
      console.error("Erro Supabase inserir-anon-key-info.");
      return res.status(500).json({ error: "Erro ao carregar." });
    }
    if (!data) {
      return res.status(404).json({ error: "Link inválido ou expirado." });
    }
    const row = data;
    const nome = row.nomeSoftware ?? row.nome_software ?? row.nomesoftware ?? "";
    const dominio = row.dominio ?? "";
    res.status(200).json({ nomeSoftware: nome, dominio });
  } catch (err) {
    console.error("Erro ao carregar info anon key.");
    res.status(500).json({ error: "Erro ao carregar." });
  }
});

app.post("/api/salvar-anon-key", async (req, res) => {
  try {
    const { token, anon_key } = req.body || {};
    if (!token || typeof token !== "string" || !anon_key || typeof anon_key !== "string") {
      return res.status(400).json({ error: "token e anon_key são obrigatórios." });
    }
    const trimmed = anon_key.trim();
    if (!trimmed) {
      return res.status(400).json({ error: "anon_key não pode ser vazio." });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("usuarios_SAAS_Agentes")
      .update({ supabase_anon_key: trimmed })
      .eq("anon_key_token", token)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("Erro Supabase salvar-anon-key (não expor detalhes).");
      return res.status(500).json({ error: "Erro ao salvar." });
    }
    if (!data) {
      return res.status(404).json({ error: "Link inválido ou expirado." });
    }
    res.status(200).json({ success: true, message: "Anon Key salva com sucesso." });
  } catch (err) {
    console.error("Erro ao salvar anon key (exceção interna).");
    res.status(500).json({ error: "Falha ao salvar." });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
