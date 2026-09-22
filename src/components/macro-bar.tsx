export function MacroBar({
  label,
  atual,
  meta,
  cor,
}: {
  label: string;
  atual: number;
  meta: number;
  cor: string;
}) {
  const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-neutral-300">{label}</span>
        <span className="text-neutral-500">
          {Math.round(atual)}g / {Math.round(meta)}g
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: cor }}
        />
      </div>
    </div>
  );
}
