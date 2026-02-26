import { getSupabase } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const token = String(req.query.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "token é obrigatório." });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("usuarios_SAAS_Agentes")
      .select("nomeSoftware, dominio, supabase_url")
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
    const nome = row.nomeSoftware ?? "";
    const dominio = row.dominio ?? "";
    const supabaseUrl = row.supabase_url ?? "";
    res.status(200).json({ nomeSoftware: nome, dominio, supabaseUrl });
  } catch (err) {
    console.error("Erro ao carregar info anon key.");
    res.status(500).json({ error: "Erro ao carregar." });
  }
}
