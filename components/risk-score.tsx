import type { RiskMetrics } from "@/lib/types";
import { Badge } from "@/components/badge";

export function RiskScore({ risk, compact = false }: { risk: RiskMetrics | null; compact?: boolean }) {
  if (!risk) return <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-4 text-sm text-slate-500">Risk profile unavailable</div>;
  const deg = Math.max(0, Math.min(100, risk.riskScore)) * 3.6;
  return (
    <div className={`rounded-2xl border border-slate-700/40 bg-slate-950/30 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center gap-5">
        <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#42d3ff 0deg ${deg}deg, rgba(148,163,184,.10) ${deg}deg 360deg)` }}>
          <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-[#0a1727]">
            <div className="text-center"><div className="text-2xl font-extrabold text-white">{risk.riskScore}</div><div className="text-[10px] uppercase tracking-wider text-slate-500">score</div></div>
          </div>
        </div>
        <div className="min-w-0 flex-1"><p className="mb-2 text-[10px] text-slate-500">Academic model · {risk.modelVersion}</p>
          <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-white">{risk.legalName}</h3><Badge value={risk.riskTier} /></div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Metric label="DSCR" value={risk.dscr === null ? "No debt" : risk.dscr.toFixed(2)} />
            <Metric label="Bureau" value={String(risk.bureauScore)} />
            <Metric label="OCF" value={`${risk.ocfMargin.toFixed(1)}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-sm font-bold text-slate-100">{value}</div><div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">{label}</div></div>;
}
