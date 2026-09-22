import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Análise por IA indisponível: ANTHROPIC_API_KEY não configurada no servidor.",
      },
      { status: 503 }
    );
  }

  const { imageBase64, mediaType } = await request.json();

  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "Imagem ausente." }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Analise essa foto de comida. Identifique o(s) alimento(s) principal(is) e estime a porção visível.
Responda APENAS com um JSON válido, sem markdown, no formato exato:
{"nome_alimento": "string curta em português", "quantidade_g_estimada": numero, "calorias": numero, "proteina_g": numero, "carboidrato_g": numero, "gordura_g": numero, "confianca": "alta" | "media" | "baixa"}
Os valores de calorias e macros devem ser referentes à porção TOTAL estimada na foto, não por 100g. Se não for possível identificar comida na imagem, responda com nome_alimento "não identificado" e todos os valores numéricos 0.`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Não foi possível interpretar a resposta da IA." },
        { status: 502 }
      );
    }

    const resultado = JSON.parse(jsonMatch[0]);
    return NextResponse.json(resultado);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Falha ao analisar a imagem." },
      { status: 500 }
    );
  }
}
