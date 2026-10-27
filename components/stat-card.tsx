import type { LucideIcon } from "lucide-react";

export function StatCard({ title, value, subtitle, icon: Icon, accent = "cyan" }: {
  title: string; value: string; subtitle?: string; icon: LucideIcon; accent?: "cyan" | "green" | "amber" | "blue";
}) {
  const styles = {
    cyan: "from-cyan-400/15 to-cyan-400/0 text-cyan-300 border-cyan-300/15",
    green: "from-emerald-400/15 to-emerald-400/0 text-emerald-300 border-emerald-300/15",
    amber: "from-amber-400/15 to-amber-400/0 text-amber-300 border-amber-300/15",
    blue: "from-blue-400/15 to-blue-400/0 text-blue-300 border-blue-300/15",
  }[accent];
  return (
    <div className="glass glow-line rounded-[22px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</p>
          {subtitle && <p className="mt-1.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={`rounded-2xl border bg-gradient-to-br p-3 ${styles}`}><Icon size={19} /></div>
      </div>
    </div>
  );
}
