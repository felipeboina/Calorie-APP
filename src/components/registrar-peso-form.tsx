"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hojeBR } from "@/lib/datas";

export function RegistrarPesoForm({ pesoAtual }: { pesoAtual: number | null }) {
  const router = useRouter();
  const [peso, setPeso] = useState(pesoAtual ? String(pesoAtual) : "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    const pesoNum = Number(peso);
    if (!pesoNum || pesoNum <= 0) {
      setErro("Informe um peso válido.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sessão expirada.");
      setSalvando(false);
      return;
    }

    const hoje = hojeBR();

    await supabase
      .from("weight_logs")
      .upsert(
        { user_id: user.id, peso: pesoNum, data: hoje },
        { onConflict: "user_id,data" }
      );

    await supabase
      .from("profiles")
      .update({ peso_atual: pesoNum })
      .eq("id", user.id);

    setSalvando(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="0.1"
        value={peso}
        onChange={(e) => setPeso(e.target.value)}
        placeholder="Peso de hoje (kg)"
        className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-500"
      />
      <button
        onClick={salvar}
        disabled={salvando}
        className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 disabled:opacity-50"
      >
        {salvando ? "..." : "Salvar"}
      </button>
      {erro && <p className="text-xs text-red-400">{erro}</p>}
    </div>
  );
}
