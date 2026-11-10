import { BadgeCheck, BriefcaseBusiness, FileSearch, IndianRupee } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOfficerDashboard } from "@/lib/data/officer";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/badge";
import { LoanDecisionActions } from "@/components/loan-decision-actions";
import { RiskScore } from "@/components/risk-score";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function OfficerDashboard() {
  const user = await requireUser(["loan_officer"]);
  const data = await getOfficerDashboard(user.userId);
  const perf = data.performance;
  const pipelineValue = data.applications.reduce((s: number, x) => s + Number(x.principal_amount), 0);
  return <div className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[.15em] text-cyan-300/65">Underwriter cockpit</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.035em] text-white">Credit decision workspace</h1><p className="mt-2 text-sm text-slate-500">Review financial risk, collateral and customer applications before activating the amortization engine.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Open applications" value={String(data.applications.length)} subtitle="Awaiting decision" icon={FileSearch}/><StatCard title="Pipeline value" value={formatCurrency(pipelineValue)} subtitle="Requested principal" icon={IndianRupee} accent="blue"/><StatCard title="Loans processed" value={String(perf?.loans_processed ?? 0)} subtitle={`${perf?.approved_loans ?? 0} approved`} icon={BriefcaseBusiness} accent="green"/><StatCard title="Average approved rate" value={perf?.avg_interest_rate_percent ? `${perf.avg_interest_rate_percent}%` : "—"} subtitle="Officer portfolio" icon={BadgeCheck} accent="amber"/></div>
    <div className="space-y-5">{data.applications.map((loan) => <SectionCard key={loan.loan_id} title={loan.borrower_name} eyebrow={`Application ${loan.loan_id.slice(0,8).toUpperCase()}`} action={<Badge value={loan.status}/>}><div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]"><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><Info label="Requested" value={formatCurrency(Number(loan.principal_amount))}/><Info label="Term" value={`${loan.term_months} months`}/><Info label="Provisional rate" value={`${(Number(loan.annual_interest_rate)*100).toFixed(2)}%`}/><Info label="Collateral" value={loan.collateral_value ? formatCurrency(Number(loan.collateral_value)) : "Not recorded"}/></div><div className="rounded-2xl border border-slate-700/25 bg-slate-950/20 p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-600">Purpose</p><p className="mt-2 text-sm leading-6 text-slate-300">{loan.purpose}</p><p className="mt-3 text-[11px] text-slate-600">Submitted {formatDate(loan.created_at)} · {loan.borrower_email}</p></div><LoanDecisionActions loanId={loan.loan_id}/></div><RiskScore risk={loan.risk}/></div></SectionCard>)}{!data.applications.length && <SectionCard title="Application queue" eyebrow="All clear"><div className="py-14 text-center"><BadgeCheck className="mx-auto text-emerald-300" size={32}/><p className="mt-3 text-sm font-semibold text-slate-300">No applications awaiting review</p><p className="mt-1 text-xs text-slate-600">New customer requests will appear here automatically.</p></div></SectionCard>}</div>
    <SectionCard title="Recent decisions" eyebrow="Your activity"><div className="table-shell"><table className="data-table"><thead><tr><th>Borrower</th><th>Principal</th><th>Status</th><th>Updated</th></tr></thead><tbody>{data.recent.map((r) => <tr key={r.loan_id}><td>{r.borrower_name}</td><td>{formatCurrency(Number(r.principal_amount))}</td><td><Badge value={r.status}/></td><td>{formatDate(r.updated_at)}</td></tr>)}</tbody></table></div></SectionCard>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-700/20 bg-slate-950/20 p-4"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-600">{label}</p><p className="mt-2 text-sm font-bold text-slate-200">{value}</p></div>; }
