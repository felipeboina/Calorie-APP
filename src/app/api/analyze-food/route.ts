import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

// Tentados em ordem; passa para o próximo se o modelo estiver sobrecarregado (503) ou descontinuado (404)
const MODELOS = process.env.GEMINI_MODEL
  ? process.env.GEMINI_MODEL.split(",").map((m) => m.trim())
  : ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3-flash-preview"];

const PROMPT = `Analise essa foto de comida. Identifique o(s) alimento(s) principal(is) e estime a porção visível.
Os valores de calorias e macros devem ser referentes à porção TOTAL estimada na foto, não por 100g.
Se não for possível identificar comida na imagem, use nome_alimento "não identificado" e todos os valores numéricos 0.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    nome_alimento: { type: "STRING" },
    quantidade_g_estimada: { type: "NUMBER" },
    calorias: { type: "NUMBER" },
    proteina_g: { type: "NUMBER" },
    carboidrato_g: { type: "NUMBER" },
    gordura_g: { type: "NUMBER" },
    confianca: { type: "STRING", enum: ["alta", "media", "baixa"] },
  },
  required: [
    "nome_alimento",
    "quantidade_g_estimada",
    "calorias",
    "proteina_g",
    "carboidrato_g",
    "gordura_g",
    "confianca",
  ],
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Análise por IA indisponível: GEMINI_API_KEY não configurada no servidor.",
      },
      { status: 503 }
    );
  }

  const { imageBase64, mediaType } = await request.json();

  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "Imagem ausente." }, { status: 400 });
  }

  try {
    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: RESPONSE_SCHEMA,
      },
    });

    let res: Response | null = null;
    for (const modelo of MODELOS) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
          body,
        }
      );
      if (res.status !== 503 && res.status !== 404) break;
    }

    if (!res) {
      return NextResponse.json({ error: "Falha ao analisar a imagem." }, { status: 502 });
    }

    if (res.status === 503) {
      return NextResponse.json(
        { error: "A IA gratuita está sobrecarregada agora. Tente de novo em instantes." },
        { status: 503 }
      );
    }

    if (res.status === 429) {
      return NextResponse.json(
        { error: "Limite gratuito da IA atingido. Tente de novo em alguns minutos." },
        { status: 429 }
      );
    }

    if (!res.ok) {
      console.error("Gemini error", res.status, await res.text());
      return NextResponse.json(
        { error: "Falha ao analisar a imagem." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const parts: { text?: string }[] =
      data?.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.map((p) => p.text ?? "").join("");

    try {
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json(
        { error: "Não foi possível interpretar a resposta da IA." },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Falha ao analisar a imagem." },
      { status: 500 }
    );
  }
}
