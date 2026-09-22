"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function WeightChart({
  data,
}: {
  data: { data: string; peso: number }[];
}) {
  if (data.length < 2) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
        Registre seu peso por pelo menos 2 dias para ver o gráfico.
      </p>
    );
  }

  const formatado = data.map((d) => ({
    ...d,
    label: new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatado} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          stroke="#525252"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#525252"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          domain={["dataMin - 1", "dataMax + 1"]}
        />
        <Tooltip
          contentStyle={{
            background: "#171717",
            border: "1px solid #262626",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "#e5e5e5" }}
          formatter={(value) => [`${value} kg`, "Peso"]}
        />
        <Line
          type="monotone"
          dataKey="peso"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ fill: "#10b981", r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
