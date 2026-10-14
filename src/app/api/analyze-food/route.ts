import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarConteudo, textoDaResposta } from "@/lib/gemini";

export const maxDuration = 30;

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
    const res = await gerarConteudo({
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

    const raw = textoDaResposta(await res.json());

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
