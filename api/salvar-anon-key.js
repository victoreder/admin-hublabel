import { getSupabase } from "./_lib.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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
      console.error("Erro Supabase salvar-anon-key.");
      return res.status(500).json({ error: "Erro ao salvar." });
    }
    if (!data) {
      return res.status(404).json({ error: "Link inválido ou expirado." });
    }
    res.status(200).json({ success: true, message: "Anon Key salva com sucesso." });
  } catch (err) {
    console.error("Erro ao salvar anon key.");
    res.status(500).json({ error: "Falha ao salvar." });
  }
}
