// Tentados em ordem; passa para o próximo se o modelo estiver sobrecarregado (503) ou descontinuado (404)
const MODELOS = process.env.GEMINI_MODEL
  ? process.env.GEMINI_MODEL.split(",").map((m) => m.trim())
  : ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3-flash-preview"];

export async function gerarConteudo(body: unknown): Promise<Response | null> {
  let res: Response | null = null;
  for (const modelo of MODELOS) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
        },
        body: JSON.stringify(body),
      }
    );
    if (res.status !== 503 && res.status !== 404) break;
  }
  return res;
}

type RespostaGemini = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

export function textoDaResposta(data: RespostaGemini): string {
  const partes = data.candidates?.[0]?.content?.parts ?? [];
  return partes.map((p) => p.text ?? "").join("");
}
