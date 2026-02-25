const { N8N_URL, N8N_WORKFLOW_ID, N8N_API_KEY } = process.env;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (!N8N_URL || !N8N_WORKFLOW_ID || !N8N_API_KEY) {
      return res.status(500).json({
        error: "Backend não configurado para n8n. Defina N8N_URL, N8N_WORKFLOW_ID e N8N_API_KEY.",
      });
    }
    const baseUrl = N8N_URL.replace(/\/$/, "");
    const url = `${baseUrl}/api/v1/workflows/${N8N_WORKFLOW_ID}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("n8n API error:", response.status, errText);
      return res.status(response.status).json({
        error: `n8n retornou ${response.status}. Verifique URL, workflow ID e API key.`,
      });
    }
    const workflow = await response.json();

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

    const link = findUrl(workflow);
    res.status(200).json({ link: link || null });
  } catch (err) {
    console.error("Erro ao buscar workflow n8n.");
    res.status(500).json({ error: "Falha ao buscar link do n8n." });
  }
}
