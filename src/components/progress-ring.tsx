function corPorProgresso(pct: number) {
  if (pct > 1.05) return "#f87171"; // vermelho - passou da meta
  if (pct >= 0.85) return "#10b981"; // verde - na meta
  return "#fbbf24"; // amarelo - abaixo
}

export function ProgressRing({
  consumidas,
  meta,
}: {
  consumidas: number;
  meta: number;
}) {
  const pct = meta > 0 ? consumidas / meta : 0;
  const pctClamp = Math.min(pct, 1);
  const raio = 80;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - pctClamp);
  const restantes = Math.round(meta - consumidas);
  const cor = corPorProgresso(pct);

  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={raio}
          fill="none"
          stroke="#262626"
          strokeWidth="16"
        />
        <circle
          cx="100"
          cy="100"
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-neutral-50">
          {restantes >= 0 ? restantes : `+${Math.abs(restantes)}`}
        </span>
        <span className="text-sm text-neutral-400">
          {restantes >= 0 ? "kcal restantes" : "kcal acima da meta"}
        </span>
      </div>
    </div>
  );
}
