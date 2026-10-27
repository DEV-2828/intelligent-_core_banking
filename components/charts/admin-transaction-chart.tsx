"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AdminTransactionChart({ data }: { data: Array<{ month: string; count: number; volume: number }> }) {
  return (
    <div className="h-[275px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#71869f", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#71869f", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#0b1b2d", border: "1px solid rgba(148,163,184,.14)", borderRadius: 14, fontSize: 12 }} formatter={(v, name) => [name === "volume" ? `₹${Number(v).toLocaleString("en-IN")}` : Number(v), name]} />
          <Bar dataKey="volume" fill="#5b8cff" radius={[8,8,2,2]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
