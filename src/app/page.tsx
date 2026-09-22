import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame, Footprints } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  comFotosAssinadas,
  getExercicioDoDia,
  getLogsDoDia,
  getProfile,
  getStreak,
  somarTotais,
} from "@/lib/queries";
import { ProgressRing } from "@/components/progress-ring";
import { MacroBar } from "@/components/macro-bar";
import { BottomNav } from "@/components/bottom-nav";
import { REFEICAO_LABELS } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile(supabase, user.id);
  if (!profile || !profile.onboarding_completo) redirect("/onboarding");

  const logsBrutos = await getLogsDoDia(supabase, user.id);
  const logs = await comFotosAssinadas(supabase, logsBrutos);
  const queimadasExercicio = await getExercicioDoDia(supabase, user.id);
  const totais = somarTotais(logsBrutos);
  const streak = await getStreak(supabase, user.id, profile.meta_calorica ?? 2000);

  const metaCalorica = profile.meta_calorica ?? 2000;
  const consumidasLiquidas = totais.calorias - queimadasExercicio;

  const primeiroNome = (profile.nome ?? "").split(" ")[0] || "atleta";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-400">Olá, {primeiroNome}</p>
          <h1 className="text-xl font-bold">Hoje</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-orange-400">
          <Flame size={18} />
          <span className="text-sm font-semibold">{streak}</span>
        </div>
      </header>

      <div className="flex flex-col items-center rounded-3xl border border-neutral-800 bg-neutral-900/50 py-8">
        <ProgressRing consumidas={consumidasLiquidas} meta={metaCalorica} />

        <div className="mt-6 grid w-full grid-cols-3 gap-3 px-6 text-center">
          <div>
            <p className="text-lg font-semibold text-neutral-100">
              {Math.round(totais.calorias)}
            </p>
            <p className="text-xs text-neutral-500">Consumidas</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-neutral-100">
              {Math.round(queimadasExercicio)}
            </p>
            <p className="text-xs text-neutral-500">Exercício</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-neutral-100">
              {metaCalorica}
            </p>
            <p className="text-xs text-neutral-500">Meta</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5">
        <MacroBar
          label="Proteína"
          atual={totais.proteina}
          meta={profile.meta_proteina ?? 0}
          cor="#34d399"
        />
        <MacroBar
          label="Carboidrato"
          atual={totais.carboidrato}
          meta={profile.meta_carboidrato ?? 0}
          cor="#60a5fa"
        />
        <MacroBar
          label="Gordura"
          atual={totais.gordura}
          meta={profile.meta_gordura ?? 0}
          cor="#fb923c"
        />
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/diario"
          className="flex-1 rounded-2xl bg-emerald-500 py-3 text-center font-semibold text-neutral-950"
        >
          + Registrar alimento
        </Link>
        <Link
          href="/diario?tipo=exercicio"
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 text-neutral-300"
        >
          <Footprints size={18} />
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-neutral-400">
          Diário de hoje
        </h2>
        {logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
            Nenhum alimento registrado ainda hoje.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3"
              >
                {log.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={log.foto_url}
                    alt={log.nome_alimento}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-lg">
                    🍽️
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-100">
                    {log.nome_alimento}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {REFEICAO_LABELS[log.refeicao]} · {Math.round(log.quantidade_g)}g
                  </p>
                </div>
                <span className="text-sm font-semibold text-neutral-200">
                  {Math.round(log.calorias)} kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
