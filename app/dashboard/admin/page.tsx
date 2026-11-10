import { Activity, Landmark, ShieldAlert, Users, WalletCards } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/data/admin";
import { formatCompactCurrency, formatCurrency, formatDateTime, maskAccount } from "@/lib/format";
import { AccountStatusButton } from "@/components/account-status-button";
import { Badge } from "@/components/badge";
import { AdminTransactionChart } from "@/components/charts/admin-transaction-chart";
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireUser(["risk_admin"]);
  const data = await getAdminDashboard();
  const s = data.summary;
  const trend = data.txTrend.map((x) => ({ month: x.month, count: Number(x.count), volume: Number(x.volume) }));
  const distribution = data.loanDistribution.map((x) => ({ status: x.status, count: Number(x.count), exposure: Number(x.exposure) }));
  return <div className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[.15em] text-cyan-300/65">Risk command center</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.035em] text-white">Enterprise banking telemetry</h1><p className="mt-2 text-sm text-slate-500">System-wide exposure, ledger movement, account controls and immutable balance audit activity.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Active customers" value={String(s?.active_customers ?? 0)} subtitle={`${s?.active_accounts ?? 0} active accounts`} icon={Users}/><StatCard title="Customer deposits" value={formatCompactCurrency(Number(s?.customer_deposits ?? 0))} subtitle="Checking + savings balances" icon={WalletCards} accent="green"/><StatCard title="Loan exposure" value={formatCompactCurrency(Number(s?.loan_exposure ?? 0))} subtitle={`${s?.approved_or_active_loans ?? 0} approved / active`} icon={Landmark} accent="blue"/><StatCard title="Defaulted loans" value={String(s?.defaulted_loans ?? 0)} subtitle={`${s?.completed_transactions ?? 0} completed transactions`} icon={ShieldAlert} accent="amber"/></div>
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><SectionCard title="Transaction volume" eyebrow="Six-month ledger"><AdminTransactionChart data={trend}/></SectionCard><SectionCard title="Credit portfolio" eyebrow="Exposure by state"><PortfolioChart data={distribution}/></SectionCard></div>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><SectionCard title="Account controls" eyebrow="Administrative action"><div className="table-shell"><table className="data-table"><thead><tr><th>Customer</th><th>Account</th><th>Balance</th><th>Status</th><th>Control</th></tr></thead><tbody>{data.accounts.map((a) => <tr key={a.account_id}><td>{a.customer_name}</td><td>{maskAccount(a.account_number)} <span className="ml-1 text-[10px] uppercase text-slate-600">{a.type}</span></td><td>{formatCurrency(Number(a.balance))}</td><td><Badge value={a.status}/></td><td><AccountStatusButton accountId={a.account_id} status={a.status}/></td></tr>)}</tbody></table></div></SectionCard><SectionCard title="Balance audit trail" eyebrow="Trigger-generated"><div className="space-y-2.5">{data.audit.map((a) => <div key={a.audit_id} className="rounded-2xl border border-slate-700/20 bg-slate-950/20 p-3.5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Activity size={14} className={Number(a.delta_amount) >= 0 ? "text-emerald-300" : "text-rose-300"}/><p className="text-xs font-semibold text-slate-300">{a.customer_name}</p></div><p className={`text-xs font-bold ${Number(a.delta_amount)>=0 ? "text-emerald-300" : "text-rose-300"}`}>{Number(a.delta_amount)>=0 ? "+" : ""}{formatCurrency(Number(a.delta_amount))}</p></div><p className="mt-2 text-[10px] text-slate-600">{maskAccount(a.account_number)} · {formatDateTime(a.changed_at)}</p></div>)}{!data.audit.length && <p className="py-8 text-center text-xs text-slate-600">Audit trail is empty.</p>}</div></SectionCard></div>
  </div>;
}
