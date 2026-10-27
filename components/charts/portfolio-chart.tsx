"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#42d3ff", "#5b8cff", "#39e6a0", "#f4c15d", "#ff7c8b", "#9d7cff", "#64748b"];

export function PortfolioChart({ data }: { data: Array<{ status: string; count: number; exposure: number }> }) {
  return (
    <div className="grid min-h-[275px] grid-cols-1 items-center md:grid-cols-[1fr_180px]">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={data} dataKey="exposure" nameKey="status" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "#0b1b2d", border: "1px solid rgba(148,163,184,.14)", borderRadius: 14, fontSize: 12 }} formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Exposure"]}/></PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2.5">{data.map((x, i) => <div key={x.status} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-slate-400"><i className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{x.status.replaceAll("_"," ")}</span><b className="text-slate-200">{x.count}</b></div>)}</div>
    </div>
  );
}
