"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function CustomerFlowChart({ data }: { data: Array<{ month: string; inflow: number; outflow: number }> }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="inflow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#42d3ff" stopOpacity={0.32}/><stop offset="100%" stopColor="#42d3ff" stopOpacity={0}/></linearGradient>
            <linearGradient id="outflow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7c8b" stopOpacity={0.22}/><stop offset="100%" stopColor="#ff7c8b" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#71869f", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#71869f", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#0b1b2d", border: "1px solid rgba(148,163,184,.14)", borderRadius: 14, fontSize: 12 }} formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} />
          <Area type="monotone" dataKey="inflow" stroke="#42d3ff" fill="url(#inflow)" strokeWidth={2.2} />
          <Area type="monotone" dataKey="outflow" stroke="#ff7c8b" fill="url(#outflow)" strokeWidth={1.8} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
