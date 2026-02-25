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
  N8N_URL,
  N8N_WORKFLOW_ID,
  N8N_API_KEY,
  OPENAI_API_KEY,
} = process.env;

// Mesma logo e cor primary do sistema (Sidebar, index.css --primary: 47 100% 54%)
const emailLogoUrl = "https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/LOGO.png";
const emailPrimaryColor = "#ffd323";

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

const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");

const INSTALACOES_EMAIL_DESTINATARIOS = [
  "financeiro@rxestrategiasdigitais.com.br",
  "viniciusederdasilva@gmail.com",
];
const LINK_INSTALACOES = FRONTEND_URL ? `${FRONTEND_URL}/admin/instalacoes` : "";

function getLinkInserirAnonKey(anonKeyToken) {
  if (!FRONTEND_URL || !anonKeyToken) return "";
  return `${FRONTEND_URL}/inserir-anon-key?id=${encodeURIComponent(anonKeyToken)}`;
}

function replaceVars(client, text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/\{\{nomeSoftware\}\}/g, client.nomeSoftware ?? "")
    .replace(/\{\{dominio\}\}/g, client.dominio ?? "")
    .replace(/\{\{email\}\}/g, client.email ?? "")
    .replace(/\{\{versao\}\}/g, client.versao ?? "")
    .replace(/\{\{linkInserirAnonKey\}\}/g, getLinkInserirAnonKey(client.anon_key_token));
}

app.post("/api/enviar-email", async (req, res) => {
  try {
    const { destinatarios, assunto, corpo } = req.body || {};
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(400).json({ error: "destinatarios é obrigatório e deve ser um array não vazio." });
    }
    const toList = destinatarios.filter((e) => typeof e === "string" && e.trim() !== "");
    if (toList.length === 0) {
      return res.status(400).json({ error: "Nenhum destinatário com email válido." });
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
      to: toList,
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

// Monta o shell do email com logo e cores (sempre iguais); o conteúdo vai no lugar de CONTENT_PLACEHOLDER
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

function buildEmailNovaInstalacao(telefone, dominio) {
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

function buildEmailInstalacaoFinalizada(telefone, dominio) {
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

app.post("/api/email-nova-instalacao", async (req, res) => {
  try {
    const { telefone, dominio } = req.body || {};
    const dominioStr = dominio != null ? String(dominio).trim() : "";
    const transporter = getTransporter();
    const html = buildEmailNovaInstalacao(telefone, dominioStr);
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: INSTALACOES_EMAIL_DESTINATARIOS,
      subject: "HubLabel – Nova instalação registrada",
      text: `Nova instalação: Domínio ${dominioStr || "—"}, Telefone ${telefone || "—"}. ${LINK_INSTALACOES ? "Acesse: " + LINK_INSTALACOES : ""}`,
      html,
    });
    res.status(200).json({ success: true, message: "Email de nova instalação enviado." });
  } catch (err) {
    console.error("Erro ao enviar email nova instalação:", err);
    res.status(500).json({ error: "Falha ao enviar email." });
  }
});

app.post("/api/email-instalacao-finalizada", async (req, res) => {
  try {
    const { telefone, dominio } = req.body || {};
    const dominioStr = dominio != null ? String(dominio).trim() : "";
    const transporter = getTransporter();
    const html = buildEmailInstalacaoFinalizada(telefone, dominioStr);
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: INSTALACOES_EMAIL_DESTINATARIOS,
      subject: "HubLabel – Instalação finalizada",
      text: `Instalação finalizada: Domínio ${dominioStr || "—"}, Telefone ${telefone || "—"}. ${LINK_INSTALACOES ? "Acesse: " + LINK_INSTALACOES : ""}`,
      html,
    });
    res.status(200).json({ success: true, message: "Email de instalação finalizada enviado." });
  } catch (err) {
    console.error("Erro ao enviar email instalação finalizada:", err);
    res.status(500).json({ error: "Falha ao enviar email." });
  }
});

// Gera apenas o CONTEÚDO do email com IA; o backend injeta em layout com logo e cores
app.post("/api/gerar-email-ia", async (req, res) => {
  try {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.trim()) {
      return res.status(500).json({
        error: "Configure OPENAI_API_KEY no .env do backend para usar geração com IA.",
      });
    }
    const { instrucoes, modeloAtual } = req.body || {};
    if (!instrucoes || typeof instrucoes !== "string") {
      return res.status(400).json({ error: "instrucoes é obrigatório e deve ser um texto." });
    }

    const isEditing = modeloAtual && typeof modeloAtual === "object" && typeof modeloAtual.corpo === "string" && modeloAtual.corpo.trim().length > 0;

    let systemPrompt;
    let userPrompt;

    if (isEditing) {
      systemPrompt = `Você EDITA um email existente. O usuário envia o HTML atual do email e as instruções de alteração.
- Retorne APENAS o HTML completo do email já modificado, sem explicações e sem markdown (sem \`\`\`).
- Mantenha a mesma estrutura: cabeçalho com logo, área de conteúdo, rodapé. Mantenha a logo e as cores (cor principal: ${emailPrimaryColor}).
- Aplique as alterações pedidas pelo usuário no conteúdo e no texto. Mantenha estilos inline.
- Não invente partes que não existiam; edite apenas o solicitado quando possível.`;
      userPrompt = `Email atual (HTML completo):\n\n${modeloAtual.corpo.trim()}\n\nInstruções do usuário (o que alterar):\n\n${instrucoes.trim()}\n\nRetorne o HTML completo do email já modificado.`;
    } else {
      systemPrompt = `Você gera APENAS o HTML do CONTEÚDO CENTRAL de um email (sem cabeçalho, sem rodapé, sem logo). Esse bloco será inserido automaticamente em um layout que já tem logo no topo e rodapé.

REGRAS OBRIGATÓRIAS:
- Retorne só o fragmento HTML do conteúdo (div ou tabela), sem <!DOCTYPE>, <html>, <body>, sem explicações e sem markdown (\`\`\`).
- Cor principal da marca (use em títulos e botões): ${emailPrimaryColor}
- UX e design:
  - Título principal: uma linha em destaque com color:${emailPrimaryColor}, font-size:20px ou 22px, font-weight:600 ou 700, margin-bottom:16px.
  - Parágrafos: color:#3f3f46, font-size:16px, line-height:1.6, margin:0 0 12px ou 16px.
  - Espaçamento: use margin/padding para respirar (ex.: 16px entre seções, 24px antes do botão).
  - Um único botão de ação (CTA): <a> com display:inline-block, background:${emailPrimaryColor}, color:#ffffff, padding:14px 28px, border-radius:8px, text-decoration:none, font-weight:600, font-size:15px. Coloque margin-top:20px ou 24px.
  - Evite visual genérico: use a cor da marca no título e no botão; texto legível e hierarquia clara.
- Estilos sempre inline (compatível com clientes de email).
- Não inclua logo nem rodapé; o sistema já adiciona.`;
      userPrompt = `Gere o HTML do conteúdo central do email (título, parágrafos e, se fizer sentido, um botão de ação). Use a cor ${emailPrimaryColor} no título e no botão. Conteúdo desejado:\n\n${instrucoes.trim()}`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("OpenAI API error:", response.status, errBody);
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: "Falha ao gerar email com IA. Verifique OPENAI_API_KEY e tente novamente.",
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return res.status(502).json({ error: "Resposta vazia da IA." });
    }

    let html = content.replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    if (!isEditing) {
      html = buildEmailShell(html);
    }

    res.status(200).json({ html });
  } catch (err) {
    console.error("Erro ao gerar email com IA:", err);
    res.status(500).json({ error: "Falha ao gerar email com IA." });
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

const BUCKET_VERSOES = "versoes";
const MESES_3 = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Busca workflow do n8n, extrai URL de download, salva JSON completo no Supabase Storage
app.get("/api/n8n/workflow-link", async (req, res) => {
  try {
    if (!N8N_URL || !N8N_WORKFLOW_ID || !N8N_API_KEY) {
      return res.status(500).json({
        error: "Backend não configurado para n8n. Defina N8N_URL, N8N_WORKFLOW_ID e N8N_API_KEY no .env.",
      });
    }
    const version = String(req.query.version || "0.0.0").trim() || "0.0.0";
    const baseUrl = N8N_URL.replace(/\/$/, "");
    const url = `${baseUrl}/api/v1/workflows/${N8N_WORKFLOW_ID}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-N8N-API-KEY": N8N_API_KEY,
      },
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("n8n API error:", response.status, errText);
      return res.status(response.status).json({
        error: `n8n retornou ${response.status}. Verifique URL, workflow ID e API key.`,
      });
    }
    const workflow = await response.json();

    // Nome do arquivo: HUBLABEL-versao-diames (mês com 3 letras), ex: HUBLABEL-5.1.3-01mar
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mmm = MESES_3[now.getMonth()];
    const safeVersion = version.replace(/[^0-9.]/g, ".").replace(/\.+/g, ".").replace(/^\.|\.$/g, "") || "0.0.0";
    const fileName = `HUBLABEL-${safeVersion}-${dd}${mmm}.json`;
    const storagePath = `workflows/${fileName}`;

    const supabase = getSupabase();
    const jsonBuffer = Buffer.from(JSON.stringify(workflow, null, 2), "utf8");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_VERSOES)
      .upload(storagePath, jsonBuffer, {
        contentType: "application/json",
        cacheControl: "3600",
        upsert: true,
      });
    if (uploadError) {
      console.error("Erro ao salvar JSON no Storage:", uploadError);
      return res.status(500).json({
        error: "Falha ao salvar arquivo no Storage. Verifique o bucket 'versoes' e políticas.",
      });
    }
    const { data: urlData } = supabase.storage.from(BUCKET_VERSOES).getPublicUrl(uploadData.path);
    const savedFileUrl = urlData.publicUrl;

    // Extrai a primeira URL http(s) encontrada no JSON (excluindo URLs do próprio n8n)
    function findUrl(obj, seen = new WeakSet()) {
      if (obj === null) return null;
      if (typeof obj === "string") {
        if (/^https?:\/\/[^\s]+$/.test(obj) && !obj.includes("n8n")) return obj;
        return null;
      }
      if (typeof obj !== "object") return null;
      if (seen.has(obj)) return null;
      try {
        seen.add(obj);
      } catch {
        return null;
      }
      if (Array.isArray(obj)) {
        for (const v of obj) {
          const u = findUrl(v, seen);
          if (u) return u;
        }
        return null;
      }
      for (const v of Object.values(obj)) {
        const u = findUrl(v, seen);
        if (u) return u;
      }
      return null;
    }

    // O link da atualização é a URL do arquivo JSON salvo no Storage
    res.status(200).json({
      link: savedFileUrl,
      savedFileUrl,
      savedFileName: fileName,
    });
  } catch (err) {
    console.error("Erro ao buscar workflow n8n:", err);
    res.status(500).json({ error: "Falha ao buscar link do n8n." });
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

// Agendar envio de email (salva na tabela emails_agendados; o cron processa depois)
app.post("/api/agendar-email", async (req, res) => {
  try {
    const { scheduledAt, destinatarios, assunto, corpo } = req.body || {};
    if (!scheduledAt || typeof scheduledAt !== "string") {
      return res.status(400).json({ error: "scheduledAt é obrigatório (ISO 8601)." });
    }
    const at = new Date(scheduledAt);
    if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) {
      return res.status(400).json({ error: "scheduledAt deve ser uma data/hora futura." });
    }
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(400).json({ error: "destinatarios é obrigatório (array de { email, nomeSoftware?, dominio?, versao?, anon_key_token? })." });
    }
    if (!assunto || typeof assunto !== "string") {
      return res.status(400).json({ error: "assunto é obrigatório." });
    }
    if (!corpo || typeof corpo !== "string") {
      return res.status(400).json({ error: "corpo é obrigatório." });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("emails_agendados")
      .insert({
        scheduled_at: at.toISOString(),
        destinatarios,
        assunto,
        corpo,
        status: "pending",
      })
      .select("id, scheduled_at")
      .single();

    if (error) {
      console.error("Erro ao agendar email:", error);
      return res.status(500).json({ error: "Falha ao agendar. Verifique se a tabela emails_agendados existe." });
    }
    res.status(200).json({
      success: true,
      message: "Email agendado.",
      id: data.id,
      scheduledAt: data.scheduled_at,
    });
  } catch (err) {
    console.error("Erro ao agendar email:", err);
    res.status(500).json({ error: "Falha ao agendar." });
  }
});

// Cron: a cada 1 minuto verifica emails_agendados com scheduled_at <= now() e status pending, envia e atualiza
const CRON_INTERVAL_MS = 60 * 1000;

async function processScheduledEmails() {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const { data: rows, error } = await supabase
      .from("emails_agendados")
      .select("id, destinatarios, assunto, corpo")
      .eq("status", "pending")
      .lte("scheduled_at", now);

    if (error) {
      console.error("Cron emails_agendados (select):", error.message);
      return;
    }
    if (!rows || rows.length === 0) return;

    const transporter = getTransporter();
    for (const row of rows) {
      const destinatarios = Array.isArray(row.destinatarios) ? row.destinatarios : [];
      const hasVars = /\{\{(?:nomeSoftware|dominio|email|versao|linkInserirAnonKey)\}\}/.test(
        (row.assunto || "") + (row.corpo || "")
      );

      try {
        if (hasVars) {
          for (const c of destinatarios) {
            const email = c && (c.email || c.Email);
            if (!email) continue;
            const assuntoOk = replaceVars(c, row.assunto || "");
            const corpoOk = replaceVars(c, row.corpo || "");
            await transporter.sendMail({
              from: `"${fromName}" <${fromAddress}>`,
              to: email,
              subject: assuntoOk,
              text: corpoOk.replace(/<[^>]*>/g, ""),
              html: corpoOk.includes("<") ? corpoOk : undefined,
            });
          }
        } else {
          const emails = destinatarios.map((c) => c && (c.email || c.Email)).filter(Boolean);
          if (emails.length > 0) {
            await transporter.sendMail({
              from: `"${fromName}" <${fromAddress}>`,
              to: emails,
              subject: row.assunto || "",
              text: (row.corpo || "").replace(/<[^>]*>/g, ""),
              html: (row.corpo || "").includes("<") ? row.corpo : undefined,
            });
          }
        }

        await supabase
          .from("emails_agendados")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
      } catch (err) {
        console.error("Cron enviar agendado id=" + row.id, err);
        await supabase
          .from("emails_agendados")
          .update({ status: "failed", error_message: err.message })
          .eq("id", row.id);
      }
    }
  } catch (err) {
    console.error("Cron processScheduledEmails:", err);
  }
}

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
  setInterval(processScheduledEmails, CRON_INTERVAL_MS);
  processScheduledEmails(); // primeira execução logo ao subir
});
