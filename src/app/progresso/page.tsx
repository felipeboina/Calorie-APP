import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCaloriasPorDia, getProfile, getWeightLogs } from "@/lib/queries";
import { WeightChart } from "@/components/weight-chart";
import { CaloriesChart } from "@/components/calories-chart";
import { RegistrarPesoForm } from "@/components/registrar-peso-form";
import { BottomNav } from "@/components/bottom-nav";

export default async function ProgressoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile(supabase, user.id);
  if (!profile || !profile.onboarding_completo) redirect("/onboarding");

  const [pesoLogs, caloriasPorDia] = await Promise.all([
    getWeightLogs(supabase, user.id, 60),
    getCaloriasPorDia(supabase, user.id, 7),
  ]);

  const primeiroPeso = pesoLogs[0]?.peso;
  const ultimoPeso = pesoLogs[pesoLogs.length - 1]?.peso ?? profile.peso_atual;
  const variacao =
    primeiroPeso && ultimoPeso ? Number((ultimoPeso - primeiroPeso).toFixed(1)) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-8">
      <h1 className="mb-5 text-xl font-bold">Progresso</h1>

      <section className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-400">Peso corporal</h2>
          {variacao !== null && (
            <span
              className={`text-sm font-semibold ${
                variacao <= 0 ? "text-emerald-400" : "text-orange-400"
              }`}
            >
              {variacao > 0 ? "+" : ""}
              {variacao} kg no período
            </span>
          )}
        </div>
        <WeightChart data={pesoLogs} />
        <div className="mt-4">
          <RegistrarPesoForm pesoAtual={profile.peso_atual} />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-400">
          Calorias na última semana
        </h2>
        <CaloriesChart data={caloriasPorDia} meta={profile.meta_calorica ?? 2000} />
      </section>

      <BottomNav />
    </main>
  );
}
