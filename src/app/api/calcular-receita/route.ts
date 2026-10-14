import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarConteudo, textoDaResposta } from "@/lib/gemini";
import type { IngredienteCalculado } from "@/lib/types";

export const maxDuration = 30;

const USDA_KEY = process.env.USDA_API_KEY ?? "DEMO_KEY";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    nome_sugerido: { type: "STRING" },
    ingredientes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nome: { type: "STRING" },
          quantidade_g: { type: "NUMBER" },
          busca_usda: { type: "STRING" },
          calorias_100g: { type: "NUMBER" },
          proteina_100g: { type: "NUMBER" },
          carboidrato_100g: { type: "NUMBER" },
          gordura_100g: { type: "NUMBER" },
        },
        required: [
          "nome",
          "quantidade_g",
          "busca_usda",
          "calorias_100g",
          "proteina_100g",
          "carboidrato_100g",
          "gordura_100g",
        ],
      },
    },
  },
  required: ["nome_sugerido", "ingredientes"],
};

function montarPrompt(descricao: string) {
  return `Você é nutricionista. O usuário descreveu o que leva em um alimento ou prato: "${descricao}"

Liste cada ingrediente seguindo estas regras:
- nome: em português, curto e genérico (ex: "Ovo de galinha").
- quantidade_g: gramas do ingrediente. Se o usuário informou gramas, use exatamente esse valor. Para medidas caseiras, converta com valores usuais (1 ovo médio = 50 g, 1 colher de sopa de óleo = 10 g, 1 colher de chá de açúcar = 5 g, 1 xícara de arroz cozido = 160 g, etc.).
- busca_usda: termo de busca em inglês no estilo das descrições da base USDA FoodData Central (ex: "egg whole raw", "tomatoes red ripe raw", "onions raw", "oil soybean salad or cooking"). Use a forma crua, a menos que o usuário diga que o ingrediente já está cozido.
- calorias_100g, proteina_100g, carboidrato_100g, gordura_100g: sua melhor estimativa por 100 g do ingrediente (serve só como conferência e reserva).
- nome_sugerido: nome curto para o prato (ex: "Ovo mexido com tomate e cebola").
Não calcule totais. Se a descrição não tiver nenhum alimento, devolva a lista de ingredientes vazia.`;
}

type Estimativa = {
  nome: string;
  quantidade_g: number;
  busca_usda: string;
  calorias_100g: number;
  proteina_100g: number;
  carboidrato_100g: number;
  gordura_100g: number;
};

type Nutrientes = Pick<
  IngredienteCalculado,
  "calorias_100g" | "proteina_100g" | "carboidrato_100g" | "gordura_100g"
>;

const arredondar = (n: number) => Math.round(n * 10) / 10;

function nutrientesValidos(n: Nutrientes) {
  const { calorias_100g: k, proteina_100g: p, carboidrato_100g: c, gordura_100g: g } = n;
  return (
    [k, p, c, g].every((v) => Number.isFinite(v) && v >= 0) &&
    k <= 900 &&
    p <= 100 &&
    c <= 100 &&
    g <= 100 &&
    p + c + g <= 100.5
  );
}

type UsdaAlimento = {
  description: string;
  foodNutrients: { nutrientNumber?: string; value?: number }[];
};

async function buscarNoUsda(
  termo: string,
  kcalEstimada: number
): Promise<{ nutrientes: Nutrientes; descricao: string } | "limite" | null> {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", termo);
  url.searchParams.set("dataType", "Foundation,SR Legacy");
  url.searchParams.set("pageSize", "5");
  url.searchParams.set("api_key", USDA_KEY);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.status === 429) return "limite";
    if (!res.ok) return null;

    const { foods } = (await res.json()) as { foods?: UsdaAlimento[] };
    for (const alimento of foods ?? []) {
      const valor = (...numeros: string[]) => {
        for (const numero of numeros) {
          const v = alimento.foodNutrients.find((n) => n.nutrientNumber === numero)?.value;
          if (typeof v === "number") return v;
        }
        return undefined;
      };
      const kcal = valor("208", "957", "958");
      if (kcal === undefined) continue;

      const nutrientes: Nutrientes = {
        calorias_100g: arredondar(kcal),
        proteina_100g: arredondar(valor("203") ?? 0),
        carboidrato_100g: arredondar(valor("205") ?? 0),
        gordura_100g: arredondar(valor("204") ?? 0),
      };

      // descarta resultados que não parecem ser o ingrediente pedido
      const tolerancia = Math.max(25, kcalEstimada * 0.35);
      if (Math.abs(kcal - kcalEstimada) > tolerancia) continue;
      if (!nutrientesValidos(nutrientes)) continue;

      return { nutrientes, descricao: alimento.description };
    }
    return null;
  } catch {
    return null;
  }
}

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
      { error: "Cálculo por IA indisponível: GEMINI_API_KEY não configurada no servidor." },
      { status: 503 }
    );
  }

  const corpo = await request.json().catch(() => null);
  const descricao =
    typeof corpo?.descricao === "string" ? corpo.descricao.replace(/\s+/g, " ").trim() : "";

  if (descricao.length < 3 || descricao.length > 300) {
    return NextResponse.json(
      { error: "Descreva o que leva no alimento (até 300 caracteres)." },
      { status: 400 }
    );
  }

  try {
    const res = await gerarConteudo({
      contents: [{ parts: [{ text: montarPrompt(descricao) }] }],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: RESPONSE_SCHEMA,
      },
    });

    if (!res || res.status === 503) {
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
      return NextResponse.json({ error: "Falha ao interpretar a descrição." }, { status: 502 });
    }

    let lido: { nome_sugerido?: string; ingredientes?: Estimativa[] };
    try {
      lido = JSON.parse(textoDaResposta(await res.json()));
    } catch {
      return NextResponse.json(
        { error: "Não foi possível interpretar a resposta da IA." },
        { status: 502 }
      );
    }

    const estimativas = (lido.ingredientes ?? []).filter(
      (i) => i && i.quantidade_g > 0 && i.quantidade_g <= 2000
    );
    if (estimativas.length === 0 || estimativas.length > 12) {
      return NextResponse.json(
        { error: "Não identifiquei ingredientes. Descreva assim: 2 ovos, 50 g de tomate, 5 g de óleo." },
        { status: 422 }
      );
    }

    const buscas = await Promise.all(
      estimativas.map((e) => buscarNoUsda(e.busca_usda, e.calorias_100g))
    );

    const ingredientes: IngredienteCalculado[] = [];
    let usouEstimativa = false;
    let limiteUsda = false;

    for (let i = 0; i < estimativas.length; i++) {
      const e = estimativas[i];
      const busca = buscas[i];
      const base = { nome: e.nome, quantidade_g: arredondar(e.quantidade_g) };

      if (busca && busca !== "limite") {
        ingredientes.push({
          ...base,
          ...busca.nutrientes,
          fonte: "usda",
          fonte_descricao: busca.descricao,
        });
        continue;
      }

      if (busca === "limite") limiteUsda = true;
      const estimado: Nutrientes = {
        calorias_100g: arredondar(e.calorias_100g),
        proteina_100g: arredondar(e.proteina_100g),
        carboidrato_100g: arredondar(e.carboidrato_100g),
        gordura_100g: arredondar(e.gordura_100g),
      };
      if (!nutrientesValidos(estimado)) {
        return NextResponse.json(
          { error: `Não consegui valores confiáveis para "${e.nome}". Tente descrevê-lo de outro jeito.` },
          { status: 422 }
        );
      }
      usouEstimativa = true;
      ingredientes.push({
        ...base,
        ...estimado,
        fonte: "ia",
        fonte_descricao: "estimativa da IA",
      });
    }

    let aviso: string | null = null;
    if (usouEstimativa) {
      aviso = limiteUsda
        ? "O limite de consultas ao USDA foi atingido; alguns ingredientes usam estimativa da IA. Confira os valores."
        : "Alguns ingredientes não foram encontrados no USDA e usam estimativa da IA. Confira os valores.";
    }

    return NextResponse.json({
      nome_sugerido: lido.nome_sugerido ?? "",
      ingredientes,
      aviso,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao calcular os valores." }, { status: 500 });
  }
}
