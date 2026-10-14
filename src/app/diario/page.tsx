"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Loader2, Search, Sparkles, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hojeBR } from "@/lib/datas";
import { comprimirImagem } from "@/lib/imagem";
import { BottomNav } from "@/components/bottom-nav";
import { somarIngredientes } from "@/lib/calculos";
import {
  REFEICAO_LABELS,
  type Food,
  type IngredienteCalculado,
  type Refeicao,
} from "@/lib/types";

function refeicaoAtual(): Refeicao {
  const h = new Date().getHours();
  if (h < 10) return "cafe_da_manha";
  if (h < 15) return "almoco";
  if (h < 18) return "lanche";
  if (h < 22) return "jantar";
  return "outro";
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function DiarioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abaInicial = searchParams.get("tipo") === "exercicio" ? "exercicio" : "alimento";
  const [aba, setAba] = useState<"alimento" | "exercicio">(abaInicial);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-8">
      <h1 className="mb-5 text-xl font-bold">Registrar</h1>

      <div className="mb-6 flex gap-2 rounded-2xl bg-neutral-900 p-1">
        <button
          onClick={() => setAba("alimento")}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
            aba === "alimento" ? "bg-emerald-500 text-neutral-950" : "text-neutral-400"
          }`}
        >
          Alimento
        </button>
        <button
          onClick={() => setAba("exercicio")}
          className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
            aba === "exercicio" ? "bg-emerald-500 text-neutral-950" : "text-neutral-400"
          }`}
        >
          Exercício
        </button>
      </div>

      {aba === "alimento" ? <FormAlimento onSalvo={() => router.push("/")} /> : null}
      {aba === "exercicio" ? <FormExercicio onSalvo={() => router.push("/")} /> : null}

      <BottomNav />
    </main>
  );
}

export default function DiarioPage() {
  return (
    <Suspense fallback={null}>
      <DiarioContent />
    </Suspense>
  );
}

function FormAlimento({ onSalvo }: { onSalvo: () => void }) {
  const [refeicao, setRefeicao] = useState<Refeicao>(refeicaoAtual());
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Food[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [foodSelecionado, setFoodSelecionado] = useState<Food | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const [salvarNaBase, setSalvarNaBase] = useState(true);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [entradaNumerica, setEntradaNumerica] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [calculando, setCalculando] = useState(false);
  const [receita, setReceita] = useState<IngredienteCalculado[] | null>(null);
  const [avisoReceita, setAvisoReceita] = useState<string | null>(null);

  const [quantidade, setQuantidade] = useState("100");
  const [nomeManual, setNomeManual] = useState("");
  const [caloriasManual, setCaloriasManual] = useState("");
  const [proteinaManual, setProteinaManual] = useState("");
  const [carboManual, setCarboManual] = useState("");
  const [gorduraManual, setGorduraManual] = useState("");

  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUsuarioId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const semBusca = !busca.trim() || !!foodSelecionado;

    const timeout = setTimeout(async () => {
      if (semBusca) {
        setResultados([]);
        return;
      }
      setBuscando(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("foods")
        .select("*")
        .ilike("nome", `%${busca.trim()}%`)
        .order("nome")
        .limit(15);
      setResultados((data ?? []) as Food[]);
      setBuscando(false);
    }, semBusca ? 0 : 300);
    return () => clearTimeout(timeout);
  }, [busca, foodSelecionado]);

  function selecionarFood(food: Food) {
    setFoodSelecionado(food);
    setBusca(food.nome);
    setResultados([]);
    setModoManual(false);
  }

  async function excluirFood(food: Food) {
    if (!window.confirm(`Excluir "${food.nome}" da base? Seu histórico continua salvo.`)) return;
    const { error } = await createClient().from("foods").delete().eq("id", food.id);
    if (error) {
      setErro("Não foi possível excluir o alimento.");
      return;
    }
    setResultados((atual) => atual.filter((f) => f.id !== food.id));
  }

  function aplicarReceita(lista: IngredienteCalculado[]) {
    const total = somarIngredientes(lista);
    const um = (n: number) => String(Math.round(n * 10) / 10);
    setQuantidade(um(total.gramas));
    setCaloriasManual(um(total.calorias));
    setProteinaManual(um(total.proteina));
    setCarboManual(um(total.carboidrato));
    setGorduraManual(um(total.gordura));
  }

  function alterarGramas(indice: number, valor: string) {
    if (!receita) return;
    const gramas = Math.max(0, Number(valor) || 0);
    const nova = receita.map((ing, i) => (i === indice ? { ...ing, quantidade_g: gramas } : ing));
    setReceita(nova);
    aplicarReceita(nova);
  }

  async function calcularReceita() {
    setErro(null);
    setAvisoReceita(null);
    if (descricao.trim().length < 3) {
      setErro("Descreva o que leva no alimento.");
      return;
    }
    setCalculando(true);
    try {
      const res = await fetch("/api/calcular-receita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível calcular os valores.");
        return;
      }
      setReceita(data.ingredientes);
      setAvisoReceita(data.aviso ?? null);
      if (!nomeManual.trim() && data.nome_sugerido) setNomeManual(data.nome_sugerido);
      aplicarReceita(data.ingredientes);
    } catch {
      setErro("Não foi possível calcular os valores. Tente novamente.");
    } finally {
      setCalculando(false);
    }
  }

  function limparSelecao() {
    setFoodSelecionado(null);
    setBusca("");
    setQuantidade("100");
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;
    const file = await comprimirImagem(original);
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function analisarComIA() {
    if (!foto) return;
    setErro(null);
    setAnalisando(true);

    try {
      const base64 = await fileToBase64(foto);
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: foto.type }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? "Não foi possível analisar a foto.");
        return;
      }

      setModoManual(true);
      setFoodSelecionado(null);
      setSalvarNaBase(false);
      setEntradaNumerica(true);
      setReceita(null);
      setNomeManual(data.nome_alimento ?? "");
      setQuantidade(String(data.quantidade_g_estimada ?? 100));
      setCaloriasManual(String(data.calorias ?? ""));
      setProteinaManual(String(data.proteina_g ?? ""));
      setCarboManual(String(data.carboidrato_g ?? ""));
      setGorduraManual(String(data.gordura_g ?? ""));
      setBusca(data.nome_alimento ?? "");
    } catch {
      setErro("Não foi possível analisar a foto. Tente novamente.");
    } finally {
      setAnalisando(false);
    }
  }

  function calcularTotaisPreview() {
    const qtd = Number(quantidade) || 0;

    if (foodSelecionado) {
      const fator = qtd / 100;
      return {
        calorias: foodSelecionado.calorias_100g * fator,
        proteina: foodSelecionado.proteina_100g * fator,
        carboidrato: foodSelecionado.carboidrato_100g * fator,
        gordura: foodSelecionado.gordura_100g * fator,
      };
    }

    // no modo manual (incluindo IA), os valores já são da porção total
    return {
      calorias: Number(caloriasManual) || 0,
      proteina: Number(proteinaManual) || 0,
      carboidrato: Number(carboManual) || 0,
      gordura: Number(gorduraManual) || 0,
    };
  }

  async function handleSalvar() {
    setErro(null);
    const nome = foodSelecionado
      ? foodSelecionado.nome
      : capitalizar(nomeManual.trim());

    if (!nome) {
      setErro("Informe o nome do alimento.");
      return;
    }
    if (!quantidade || Number(quantidade) <= 0) {
      setErro("Informe uma quantidade válida.");
      return;
    }
    if (!foodSelecionado && !caloriasManual) {
      setErro("Informe as calorias do alimento.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sessão expirada. Faça login novamente.");
      setSalvando(false);
      return;
    }

    let foodId: string | null = foodSelecionado?.id ?? null;
    if (!foodSelecionado && modoManual && salvarNaBase) {
      const qtd = Number(quantidade);
      const por100 = (valor: string) =>
        Math.round((((Number(valor) || 0) * 100) / qtd) * 10) / 10;
      const novo = {
        nome,
        calorias_100g: por100(caloriasManual),
        proteina_100g: por100(proteinaManual),
        carboidrato_100g: por100(carboManual),
        gordura_100g: por100(gorduraManual),
        porcao_padrao_g: qtd,
        porcao_padrao_desc: receita && !entradaNumerica ? descricao.trim().slice(0, 200) : null,
        fonte: "usuario",
        created_by: user.id,
      };

      if (novo.calorias_100g <= 0) {
        setErro("Para guardar na base, informe as calorias do alimento.");
        setSalvando(false);
        return;
      }
      if (
        novo.calorias_100g > 900 ||
        novo.proteina_100g + novo.carboidrato_100g + novo.gordura_100g > 100.5
      ) {
        setErro(
          "Esses valores não fecham para a quantidade informada (máximo de 900 kcal e 100 g de macros a cada 100 g). Confira as calorias e a quantidade."
        );
        setSalvando(false);
        return;
      }

      const { data: criado, error: foodError } = await supabase
        .from("foods")
        .insert(novo)
        .select("id")
        .single();

      if (foodError) {
        if (foodError.code === "23505") {
          setErro(`"${nome}" já existe na base. Selecione ele na lista de busca.`);
          setModoManual(false);
          setBusca(nome);
        } else {
          setErro("Não foi possível guardar o alimento na base. Tente novamente.");
        }
        setSalvando(false);
        return;
      }
      foodId = criado.id;
    }

    let fotoPath: string | null = null;
    if (foto) {
      const ext = foto.name.split(".").pop() ?? "jpg";
      fotoPath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("food-photos")
        .upload(fotoPath, foto);
      if (uploadError) {
        setErro("Falha ao enviar a foto, mas você pode salvar sem ela.");
        fotoPath = null;
      }
    }

    const totais = calcularTotaisPreview();

    const { error: insertError } = await supabase.from("food_logs").insert({
      user_id: user.id,
      food_id: foodId,
      nome_alimento: nome,
      quantidade_g: Number(quantidade),
      calorias: totais.calorias,
      proteina: totais.proteina,
      carboidrato: totais.carboidrato,
      gordura: totais.gordura,
      refeicao,
      data: hojeBR(),
      foto_url: fotoPath,
      fonte: foodSelecionado ? "base" : foto ? "ia" : "manual",
    });

    setSalvando(false);

    if (insertError) {
      setErro("Não foi possível salvar o registro. Tente novamente.");
      return;
    }

    onSalvo();
  }

  const totaisPreview = calcularTotaisPreview();
  const modoDescricao = modoManual && !foodSelecionado && !entradaNumerica;
  const aguardandoCalculo = modoDescricao && !receita;
  const quantidadeTravada = modoDescricao && !!receita;
  const qtdNum = Number(quantidade) || 0;
  const kcalPor100g =
    qtdNum > 0 ? Math.round(((Number(caloriasManual) || 0) * 100) / qtdNum) : 0;
  const podeSalvar =
    (foodSelecionado || (modoManual && nomeManual && caloriasManual)) &&
    Number(quantidade) > 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Refeição</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(REFEICAO_LABELS) as Refeicao[]).map((r) => (
            <button
              key={r}
              onClick={() => setRefeicao(r)}
              className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                refeicao === r
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400"
              }`}
            >
              {REFEICAO_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">
          Buscar alimento
        </label>
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              if (foodSelecionado) setFoodSelecionado(null);
            }}
            placeholder="ex: arroz, frango, banana..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-3 pl-10 pr-10 text-neutral-100 outline-none focus:border-emerald-500"
          />
          {busca && (
            <button
              onClick={() => {
                setBusca("");
                setFoodSelecionado(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {buscando && (
          <p className="mt-2 text-xs text-neutral-500">Buscando...</p>
        )}

        {resultados.length > 0 && (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900">
            {resultados.map((food) => (
              <li key={food.id} className="flex items-center hover:bg-neutral-800">
                <button
                  onClick={() => selecionarFood(food)}
                  className="flex flex-1 items-center justify-between gap-2 px-4 py-3 text-left text-sm"
                >
                  <span>
                    {food.nome}
                    {food.fonte === "usuario" && (
                      <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                        comunidade
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {Math.round(food.calorias_100g)} kcal/100g
                  </span>
                </button>
                {usuarioId && food.created_by === usuarioId && (
                  <button
                    onClick={() => excluirFood(food)}
                    aria-label={`Excluir ${food.nome}`}
                    className="px-3 py-3 text-neutral-500 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {busca.trim() && !buscando && !foodSelecionado && !modoManual && (
          <button
            onClick={() => {
              setModoManual(true);
              setNomeManual(busca.trim());
              setSalvarNaBase(true);
            }}
            className="mt-2 text-left text-sm font-medium text-emerald-400"
          >
            {resultados.length > 0 ? "Não é nenhum desses? " : "Não encontrei. "}
            Cadastrar &quot;{busca.trim()}&quot; como novo alimento
          </button>
        )}
      </div>

      {(foodSelecionado || modoManual) && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          {foodSelecionado && (
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-100">
                {foodSelecionado.nome}
              </p>
              <button onClick={limparSelecao} className="text-neutral-500">
                <X size={16} />
              </button>
            </div>
          )}

          {modoManual && !foodSelecionado && (
            <div className="mb-3 flex flex-col gap-3">
              <input
                type="text"
                value={nomeManual}
                onChange={(e) => setNomeManual(e.target.value)}
                placeholder="Nome do alimento"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-500"
              />
              {entradaNumerica ? (
                <>
                  <p className="text-xs text-neutral-500">
                    Informe os valores para a quantidade em gramas logo abaixo.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <LabeledInput
                      label="Calorias (porção)"
                      value={caloriasManual}
                      onChange={setCaloriasManual}
                    />
                    <LabeledInput
                      label="Proteína (g)"
                      value={proteinaManual}
                      onChange={setProteinaManual}
                    />
                    <LabeledInput
                      label="Carboidrato (g)"
                      value={carboManual}
                      onChange={setCarboManual}
                    />
                    <LabeledInput
                      label="Gordura (g)"
                      value={gorduraManual}
                      onChange={setGorduraManual}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEntradaNumerica(false)}
                    className="text-left text-xs text-emerald-400 underline"
                  >
                    Descrever os ingredientes e calcular automaticamente
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-400">
                      O que tem nesse alimento?
                    </label>
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      rows={3}
                      maxLength={300}
                      placeholder="ex: 2 ovos, 50 g de tomate, 50 g de cebola e 5 g de óleo"
                      className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={calcularReceita}
                      disabled={calculando}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-300 disabled:opacity-60"
                    >
                      {calculando ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      {calculando
                        ? "Pesquisando valores..."
                        : receita
                        ? "Recalcular"
                        : "Calcular valores nutricionais"}
                    </button>
                  </div>

                  {avisoReceita && <p className="text-xs text-amber-400">{avisoReceita}</p>}

                  {receita && (
                    <div className="flex flex-col gap-2 rounded-xl bg-neutral-950 p-3">
                      {receita.map((ing, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-neutral-100">{ing.nome}</p>
                            <p className="truncate text-[10px] text-neutral-500">
                              {ing.fonte === "usda"
                                ? `USDA: ${ing.fonte_descricao}`
                                : "Estimativa da IA"}{" "}
                              · {Math.round(ing.calorias_100g)} kcal/100 g
                            </p>
                          </div>
                          <input
                            type="number"
                            value={ing.quantidade_g}
                            onChange={(e) => alterarGramas(i, e.target.value)}
                            aria-label={`Gramas de ${ing.nome}`}
                            className="w-16 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-right text-xs text-neutral-100 outline-none focus:border-emerald-500"
                          />
                          <span className="text-neutral-500">g</span>
                          <span className="w-16 text-right font-semibold text-neutral-200">
                            {Math.round((ing.calorias_100g * ing.quantidade_g) / 100)} kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setEntradaNumerica(true)}
                    className="text-left text-xs text-neutral-500 underline"
                  >
                    Prefiro informar calorias e macros manualmente
                  </button>
                </>
              )}
              <label className="flex items-start gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={salvarNaBase}
                  onChange={(e) => setSalvarNaBase(e.target.checked)}
                  className="mt-0.5 accent-emerald-500"
                />
                <span>
                  Guardar na base de alimentos: aparece nas próximas buscas para todos
                  que usam o app
                  {salvarNaBase && kcalPor100g > 0 && ` (${kcalPor100g} kcal por 100 g)`}
                </span>
              </label>
            </div>
          )}

          {!aguardandoCalculo && (
          <div className="mb-3">
            <label className="mb-1 block text-xs text-neutral-400">
              {quantidadeTravada ? "Peso total dos ingredientes (g)" : "Quantidade (g)"}
            </label>
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              readOnly={quantidadeTravada}
              className={`w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 ${
                quantidadeTravada ? "text-neutral-500" : "text-neutral-100"
              }`}
            />
          </div>
          )}

          {!aguardandoCalculo && (
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-neutral-950 p-3 text-center text-xs">
            <div>
              <p className="font-semibold text-neutral-100">
                {Math.round(totaisPreview.calorias)}
              </p>
              <p className="text-neutral-500">kcal</p>
            </div>
            <div>
              <p className="font-semibold text-emerald-400">
                {Math.round(totaisPreview.proteina)}g
              </p>
              <p className="text-neutral-500">prot</p>
            </div>
            <div>
              <p className="font-semibold text-blue-400">
                {Math.round(totaisPreview.carboidrato)}g
              </p>
              <p className="text-neutral-500">carb</p>
            </div>
            <div>
              <p className="font-semibold text-orange-400">
                {Math.round(totaisPreview.gordura)}g
              </p>
              <p className="text-neutral-500">gord</p>
            </div>
          </div>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm text-neutral-300">
          Foto do alimento (opcional)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotoChange}
          className="hidden"
        />
        {fotoPreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoPreview}
              alt="Preview"
              className="h-40 w-full rounded-xl object-cover"
            />
            <button
              onClick={() => {
                setFoto(null);
                setFotoPreview(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-neutral-950/80 p-1.5"
            >
              <X size={16} />
            </button>
            <button
              onClick={analisarComIA}
              disabled={analisando}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-neutral-950 disabled:opacity-60"
            >
              {analisando ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {analisando ? "Analisando..." : "Analisar com IA"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-700 py-6 text-sm text-neutral-400"
          >
            <Camera size={20} />
            Tirar ou escolher foto
          </button>
        )}
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <button
        onClick={handleSalvar}
        disabled={!podeSalvar || salvando}
        className="rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950 transition disabled:opacity-40"
      >
        {salvando ? "Salvando..." : "Salvar no diário"}
      </button>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-400">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
      />
    </div>
  );
}

function FormExercicio({ onSalvo }: { onSalvo: () => void }) {
  const [nome, setNome] = useState("");
  const [calorias, setCalorias] = useState("");
  const [duracao, setDuracao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setErro(null);
    if (!nome.trim() || !calorias) {
      setErro("Informe o nome da atividade e as calorias queimadas.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sessão expirada. Faça login novamente.");
      setSalvando(false);
      return;
    }

    const { error } = await supabase.from("exercise_logs").insert({
      user_id: user.id,
      nome: nome.trim(),
      calorias_queimadas: Number(calorias),
      duracao_min: duracao ? Number(duracao) : null,
      data: hojeBR(),
    });

    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar. Tente novamente.");
      return;
    }
    onSalvo();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Atividade</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="ex: Corrida, Musculação, Caminhada..."
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Calorias queimadas
          </label>
          <input
            type="number"
            value={calorias}
            onChange={(e) => setCalorias(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Duração (min)
          </label>
          <input
            type="number"
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950 disabled:opacity-40"
      >
        {salvando ? "Salvando..." : "Salvar exercício"}
      </button>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
