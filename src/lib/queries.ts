import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoodLog, Profile } from "./types";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data as Profile | null;
}

export async function getLogsDoDia(
  supabase: SupabaseClient,
  userId: string,
  data = hoje()
) {
  const { data: logs } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("data", data)
    .order("horario", { ascending: true });
  return (logs ?? []) as FoodLog[];
}

export async function getExercicioDoDia(
  supabase: SupabaseClient,
  userId: string,
  data = hoje()
) {
  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("data", data);
  return (logs ?? []).reduce((acc, l) => acc + Number(l.calorias_queimadas), 0);
}

export async function comFotosAssinadas(
  supabase: SupabaseClient,
  logs: FoodLog[]
): Promise<FoodLog[]> {
  const comFoto = logs.filter((l) => l.foto_url);
  if (comFoto.length === 0) return logs;

  const urlsPorPath = new Map<string, string>();

  await Promise.all(
    comFoto.map(async (l) => {
      const { data } = await supabase.storage
        .from("food-photos")
        .createSignedUrl(l.foto_url as string, 3600);
      if (data?.signedUrl) urlsPorPath.set(l.foto_url as string, data.signedUrl);
    })
  );

  return logs.map((l) =>
    l.foto_url && urlsPorPath.has(l.foto_url)
      ? { ...l, foto_url: urlsPorPath.get(l.foto_url)! }
      : l
  );
}

export function somarTotais(logs: FoodLog[]) {
  return logs.reduce(
    (acc, l) => ({
      calorias: acc.calorias + Number(l.calorias),
      proteina: acc.proteina + Number(l.proteina),
      carboidrato: acc.carboidrato + Number(l.carboidrato),
      gordura: acc.gordura + Number(l.gordura),
    }),
    { calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 }
  );
}

export async function getWeightLogs(
  supabase: SupabaseClient,
  userId: string,
  dias = 60
) {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const { data } = await supabase
    .from("weight_logs")
    .select("data, peso")
    .eq("user_id", userId)
    .gte("data", desde.toISOString().slice(0, 10))
    .order("data", { ascending: true });

  return (data ?? []) as { data: string; peso: number }[];
}

export async function getCaloriasPorDia(
  supabase: SupabaseClient,
  userId: string,
  dias = 7
) {
  const desde = new Date();
  desde.setDate(desde.getDate() - (dias - 1));
  const desdeStr = desde.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("food_logs")
    .select("data, calorias")
    .eq("user_id", userId)
    .gte("data", desdeStr);

  const porDia = new Map<string, number>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(desde);
    d.setDate(d.getDate() + i);
    porDia.set(d.toISOString().slice(0, 10), 0);
  }
  for (const log of data ?? []) {
    porDia.set(log.data, (porDia.get(log.data) ?? 0) + Number(log.calorias));
  }

  return Array.from(porDia.entries()).map(([data, calorias]) => ({
    data,
    calorias,
  }));
}

export async function getStreak(
  supabase: SupabaseClient,
  userId: string,
  metaCalorica: number
) {
  const { data: logs } = await supabase
    .from("food_logs")
    .select("data, calorias")
    .eq("user_id", userId)
    .order("data", { ascending: false })
    .limit(500);

  if (!logs || logs.length === 0) return 0;

  const porDia = new Map<string, number>();
  for (const l of logs) {
    porDia.set(l.data, (porDia.get(l.data) ?? 0) + Number(l.calorias));
  }

  let streak = 0;
  const cursor = new Date();
  // não penaliza o dia de hoje se ainda não fechou a meta
  const hojeStr = hoje();

  for (let i = 0; i < 365; i++) {
    const diaStr = cursor.toISOString().slice(0, 10);
    const total = porDia.get(diaStr);

    if (diaStr === hojeStr) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (total === undefined) break;

    const dentroDaMeta = total <= metaCalorica * 1.1;
    if (!dentroDaMeta) break;

    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
