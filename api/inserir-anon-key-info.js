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
    const nome = data.nomeSoftware ?? data.nome_software ?? data.nomesoftware ?? "";
    const dominio = data.dominio ?? "";
    res.status(200).json({ nomeSoftware: nome, dominio });
  } catch (err) {
    console.error("Erro ao carregar info anon key.");
    res.status(500).json({ error: "Erro ao carregar." });
  }
}
