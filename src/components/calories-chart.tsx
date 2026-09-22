"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function CaloriesChart({
  data,
  meta,
}: {
  data: { data: string; calorias: number }[];
  meta: number;
}) {
  const formatado = data.map((d) => ({
    ...d,
    label: new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "short",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={formatado} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="label"
          stroke="#525252"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#171717",
            border: "1px solid #262626",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "#e5e5e5" }}
          formatter={(value) => [`${Math.round(Number(value))} kcal`, "Consumidas"]}
        />
        <Bar dataKey="calorias" radius={[6, 6, 0, 0]}>
          {formatado.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.calorias > meta * 1.05
                  ? "#f87171"
                  : d.calorias >= meta * 0.85
                  ? "#10b981"
                  : "#3f3f46"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
