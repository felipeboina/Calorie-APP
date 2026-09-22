"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Loader2, Search, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { REFEICAO_LABELS, type Food, type Refeicao } from "@/lib/types";

function refeicaoAtual(): Refeicao {
  const h = new Date().getHours();
  if (h < 10) return "cafe_da_manha";
  if (h < 15) return "almoco";
  if (h < 18) return "lanche";
  if (h < 22) return "jantar";
  return "outro";
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

  function limparSelecao() {
    setFoodSelecionado(null);
    setBusca("");
    setQuantidade("100");
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
    const nome = foodSelecionado ? foodSelecionado.nome : nomeManual.trim();

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
      food_id: foodSelecionado?.id ?? null,
      nome_alimento: nome,
      quantidade_g: Number(quantidade),
      calorias: totais.calorias,
      proteina: totais.proteina,
      carboidrato: totais.carboidrato,
      gordura: totais.gordura,
      refeicao,
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
              <li key={food.id}>
                <button
                  onClick={() => selecionarFood(food)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-neutral-800"
                >
                  <span>{food.nome}</span>
                  <span className="text-xs text-neutral-500">
                    {Math.round(food.calorias_100g)} kcal/100g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {busca && resultados.length === 0 && !buscando && !foodSelecionado && (
          <button
            onClick={() => {
              setModoManual(true);
              setNomeManual(busca);
            }}
            className="mt-2 text-sm font-medium text-emerald-400"
          >
            Não encontrei &quot;{busca}&quot; — cadastrar manualmente
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
            </div>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-xs text-neutral-400">
              Quantidade (g)
            </label>
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-500"
            />
          </div>

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
