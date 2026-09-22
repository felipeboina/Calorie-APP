"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  type Profile,
  type Sexo,
} from "@/lib/types";

export function PerfilForm({ profile, email }: { profile: Profile; email: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(profile.nome ?? "");
  const [idade, setIdade] = useState(String(profile.idade ?? ""));
  const [sexo, setSexo] = useState<Sexo>(profile.sexo ?? "masculino");
  const [altura, setAltura] = useState(String(profile.altura_cm ?? ""));
  const [peso, setPeso] = useState(String(profile.peso_atual ?? ""));
  const [nivelAtividade, setNivelAtividade] = useState<NivelAtividade>(
    profile.nivel_atividade
  );
  const [objetivo, setObjetivo] = useState<Objetivo>(profile.objetivo);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const metaPreview = (() => {
    const idadeNum = Number(idade);
    const alturaNum = Number(altura);
    const pesoNum = Number(peso);
    if (!idadeNum || !alturaNum || !pesoNum) return null;
    const tmb = calcularTMB(sexo, pesoNum, alturaNum, idadeNum);
    const gasto = calcularGastoTotal(tmb, nivelAtividade);
    const meta = calcularMetaCalorica(gasto, objetivo);
    return { meta, macros: calcularMacros(meta, objetivo) };
  })();

  async function salvar() {
    setMensagem(null);
    setSalvando(true);
    const supabase = createClient();

    const idadeNum = Number(idade);
    const alturaNum = Number(altura);
    const pesoNum = Number(peso);
    const meta = metaPreview?.meta ?? profile.meta_calorica;
    const macros = metaPreview?.macros;

    const { error } = await supabase
      .from("profiles")
      .update({
        nome,
        idade: idadeNum || null,
        sexo,
        altura_cm: alturaNum || null,
        peso_atual: pesoNum || null,
        nivel_atividade: nivelAtividade,
        objetivo,
        meta_calorica: meta,
        meta_proteina: macros?.proteina ?? profile.meta_proteina,
        meta_carboidrato: macros?.carboidrato ?? profile.meta_carboidrato,
        meta_gordura: macros?.gordura ?? profile.meta_gordura,
      })
      .eq("id", profile.id);

    setSalvando(false);

    if (error) {
      setMensagem("Não foi possível salvar. Tente novamente.");
      return;
    }

    setMensagem("Dados atualizados!");
    router.refresh();
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
        <p className="text-xs text-neutral-500">Conta</p>
        <p className="text-sm text-neutral-200">{email}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">Nome</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Idade</label>
          <input
            type="number"
            value={idade}
            onChange={(e) => setIdade(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Sexo</label>
          <select
            value={sexo}
            onChange={(e) => setSexo(e.target.value as Sexo)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
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
            value={altura}
            onChange={(e) => setAltura(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Peso (kg)
          </label>
          <input
            type="number"
            step="0.1"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">
          Nível de atividade
        </label>
        <select
          value={nivelAtividade}
          onChange={(e) => setNivelAtividade(e.target.value as NivelAtividade)}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        >
          {Object.entries(ATIVIDADE_LABELS).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">Objetivo</label>
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

      {metaPreview && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="text-neutral-300">
            Nova meta: <span className="font-semibold text-emerald-400">{metaPreview.meta} kcal/dia</span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {metaPreview.macros.proteina}g proteína · {metaPreview.macros.carboidrato}g carboidrato ·{" "}
            {metaPreview.macros.gordura}g gordura
          </p>
        </div>
      )}

      {mensagem && <p className="text-sm text-emerald-400">{mensagem}</p>}

      <button
        onClick={salvar}
        disabled={salvando}
        className="rounded-xl bg-emerald-500 py-3 font-semibold text-neutral-950 disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Salvar alterações"}
      </button>

      <button
        onClick={logout}
        className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 py-3 text-sm font-medium text-neutral-400"
      >
        <LogOut size={16} />
        Sair da conta
      </button>
    </div>
  );
}
