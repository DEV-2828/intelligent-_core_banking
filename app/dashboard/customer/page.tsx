import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Landmark, Send, WalletCards } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCustomerOverview } from "@/lib/data/customer";
import { formatCurrency, formatDateTime, maskAccount } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/badge";
import { CustomerFlowChart } from "@/components/charts/customer-flow-chart";

export const dynamic = "force-dynamic";

export default async function CustomerDashboard() {
  const user = await requireUser(["customer"]);
  const data = await getCustomerOverview(user.userId);
  const activeLoan = data.loans.find((x) => x.status === "active");
  const chart = data.trend.map(x => ({ month: x.month, inflow: Number(x.inflow), outflow: Number(x.outflow) }));
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-cyan-300/65">Customer banking</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.035em] text-white">Good day, {user.firstName}.</h1><p className="mt-2 text-sm text-slate-500">Your money, credit and payment activity in one view.</p></div><div className="flex gap-2"><Link href="/dashboard/customer/transfer" className="btn-primary flex items-center gap-2 text-sm"><Send size={15}/> New transfer</Link><Link href="/dashboard/customer/loans" className="btn-secondary text-sm">Manage loans</Link></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Total balance" value={formatCurrency(data.totalBalance)} subtitle={`${data.accounts.length} linked account${data.accounts.length === 1 ? "" : "s"}`} icon={WalletCards}/><StatCard title="Active credit" value={activeLoan ? formatCurrency(Number(activeLoan.outstanding_principal)) : "No active loan"} subtitle={activeLoan ? `${activeLoan.remaining_installments} EMIs remaining` : "Apply from Credit & loans"} icon={Landmark} accent="blue"/><StatCard title="Next EMI" value={activeLoan?.next_due_amount ? formatCurrency(Number(activeLoan.next_due_amount)) : "—"} subtitle={activeLoan?.next_due_date ?? "No payment scheduled"} icon={CreditCard} accent="amber"/><StatCard title="Account health" value="Protected" subtitle="Minimum balance controls active" icon={ArrowUpRight} accent="green"/></div>
    <div className="grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
      <SectionCard title="Money movement" eyebrow="Six-month trend"><CustomerFlowChart data={chart}/></SectionCard>
      <SectionCard title="Your accounts" eyebrow="Core ledger"><div className="space-y-3">{data.accounts.map(a => <div key={a.account_id} className="rounded-2xl border border-slate-700/25 bg-slate-950/25 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold capitalize text-slate-200">{a.type}</p><p className="mt-1 text-[11px] text-slate-600">{maskAccount(a.account_number)} · {a.branch_name}</p></div><Badge value={a.status}/></div><p className="mt-5 text-2xl font-bold tracking-tight text-white">{formatCurrency(Number(a.balance), a.currency)}</p><p className="mt-1 text-[10px] text-slate-600">Available above minimum: {formatCurrency(Number(a.balance)-Number(a.minimum_balance))}</p></div>)}</div></SectionCard>
    </div>
    <SectionCard title="Recent transactions" eyebrow="Ledger activity" action={<Link href="/dashboard/customer/transfer" className="text-xs font-semibold text-cyan-300">Make payment →</Link>}><div className="space-y-1">{data.transactions.map(t => { const incoming = t.destination_user_id === user.userId; return <div key={t.transaction_id} className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 transition hover:bg-white/[.025]"><div className="flex min-w-0 items-center gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${incoming ? "bg-emerald-400/[.08] text-emerald-300" : "bg-cyan-400/[.07] text-cyan-300"}`}>{incoming ? <ArrowDownLeft size={17}/> : <ArrowUpRight size={17}/>}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-200">{t.description || t.type.replaceAll("_"," ")}</p><p className="mt-1 text-[10px] text-slate-600">{formatDateTime(t.created_at)} · {t.reference_number}</p></div></div><div className="text-right"><p className={`text-sm font-bold ${incoming ? "text-emerald-300" : "text-slate-200"}`}>{incoming ? "+" : "−"}{formatCurrency(Number(t.amount))}</p><p className="mt-1 text-[10px] uppercase text-slate-600">{t.status}</p></div></div>})}{!data.transactions.length && <p className="py-8 text-center text-sm text-slate-600">No transactions yet.</p>}</div></SectionCard>
  </div>;
}
