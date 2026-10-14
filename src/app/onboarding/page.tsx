"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hojeBR } from "@/lib/datas";
import {
  calcularGastoTotal,
  calcularMacros,
  calcularMetaCalorica,
  calcularTMB,
} from "@/lib/calculos";
import {
  ATIVIDADE_LABELS,
  OBJETIVO_LABELS,
  type NivelAtividade,
  type Objetivo,
  type Sexo,
} from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [idade, setIdade] = useState("");
  const [sexo, setSexo] = useState<Sexo>("masculino");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [nivelAtividade, setNivelAtividade] =
    useState<NivelAtividade>("moderado");
  const [objetivo, setObjetivo] = useState<Objetivo>("deficit");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const idadeNum = Number(idade);
    const alturaNum = Number(altura);
    const pesoNum = Number(peso);

    if (!idadeNum || !alturaNum || !pesoNum) {
      setErro("Preencha todos os campos com valores válidos.");
      return;
    }

    setCarregando(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sessão expirada. Faça login novamente.");
      setCarregando(false);
      return;
    }

    const tmb = calcularTMB(sexo, pesoNum, alturaNum, idadeNum);
    const gastoTotal = calcularGastoTotal(tmb, nivelAtividade);
    const metaCalorica = calcularMetaCalorica(gastoTotal, objetivo);
    const macros = calcularMacros(metaCalorica, objetivo);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        idade: idadeNum,
        sexo,
        altura_cm: alturaNum,
        peso_atual: pesoNum,
        nivel_atividade: nivelAtividade,
        objetivo,
        meta_calorica: metaCalorica,
        meta_proteina: macros.proteina,
        meta_carboidrato: macros.carboidrato,
        meta_gordura: macros.gordura,
        onboarding_completo: true,
      })
      .eq("id", user.id);

    if (profileError) {
      setErro("Não foi possível salvar seus dados. Tente novamente.");
      setCarregando(false);
      return;
    }

    await supabase.from("weight_logs").upsert(
      {
        user_id: user.id,
        peso: pesoNum,
        data: hojeBR(),
      },
      { onConflict: "user_id,data" }
    );

    setCarregando(false);
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-emerald-400">
            Vamos configurar sua meta
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Esses dados definem quantas calorias você deve consumir por dia
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-neutral-300">
                Idade
              </label>
              <input
                type="number"
                required
                min={10}
                max={100}
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-emerald-500"
                placeholder="anos"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">Sexo</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as Sexo)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-emerald-500"
              >
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-neutral-300">
                Altura (cm)
              </label>
              <input
                type="number"
                required
                min={100}
                max={250}
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-emerald-500"
                placeholder="175"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">
                Peso (kg)
              </label>
              <input
                type="number"
                required
                min={30}
                max={300}
                step="0.1"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-emerald-500"
                placeholder="70"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-300">
              Nível de atividade
            </label>
            <select
              value={nivelAtividade}
              onChange={(e) =>
                setNivelAtividade(e.target.value as NivelAtividade)
              }
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-neutral-100 outline-none focus:border-emerald-500"
            >
              {Object.entries(ATIVIDADE_LABELS).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-300">
              Objetivo
            </label>
            <div className="grid gap-2">
              {Object.entries(OBJETIVO_LABELS).map(([valor, label]) => (
                <button
                  type="button"
                  key={valor}
                  onClick={() => setObjetivo(valor as Objetivo)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    objetivo === valor
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                      : "border-neutral-800 bg-neutral-900 text-neutral-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="mt-2 rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {carregando ? "Calculando..." : "Calcular minha meta"}
          </button>
        </form>
      </div>
    </main>
  );
}
