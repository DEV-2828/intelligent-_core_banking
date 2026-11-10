import {CollateralForm} from "@/components/collateral-form";
import {CollateralList} from "@/components/collateral-list";
import { PrintButton } from "@/components/print-button";
import { CreditCard, FileText, Landmark, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCustomerLoans, getCustomerOverview } from "@/lib/data/customer";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/badge";
import { LoanApplicationForm } from "@/components/loan-application-form";
import { RepaymentButton } from "@/components/repayment-button";
import { RiskScore } from "@/components/risk-score";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function CustomerLoansPage() {
  const user = await requireUser(["customer"]);
  const [loans, overview] = await Promise.all([getCustomerLoans(user.userId), getCustomerOverview(user.userId)]);
  const sourceAccount = overview.accounts.find(a => a.status === "active");
  const active = loans.find(l => l.status === "active");
  const nextEmi = active?.repayments.find((r) => !r.is_settled);

  return <div className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[.15em] text-cyan-300/65">Credit & lending</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.035em] text-white">Borrowing intelligence</h1><p className="mt-2 text-sm text-slate-500">Applications combine your MySQL banking relationship with MongoDB commercial-risk analytics.</p></div>
    <div className="grid gap-4 md:grid-cols-3"><StatCard title="Loan exposure" value={active ? formatCurrency(Number(active.outstanding_principal)) : "₹0"} subtitle={active ? `${active.term_months}-month facility` : "No active facility"} icon={Landmark}/><StatCard title="Next installment" value={nextEmi ? formatCurrency(Number(nextEmi.total_due)) : "—"} subtitle={nextEmi ? formatDate(nextEmi.due_date) : "No EMI due"} icon={CreditCard} accent="amber"/><StatCard title="Risk profile" value={active?.risk?.riskTier ?? loans[0]?.risk?.riskTier ?? "Not scored"} subtitle={active?.risk ? `Composite score ${active.risk.riskScore}` : "MongoDB credit engine"} icon={ShieldCheck} accent="green"/></div>
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]"><SectionCard title="New credit request" eyebrow="Commercial lending"><LoanApplicationForm accounts={overview.accounts.filter(a=>a.status==="active").map(a=>({account_id:String(a.account_id),account_number:String(a.account_number)}))}/></SectionCard><SectionCard title="Live risk snapshot" eyebrow="MongoDB analytics"><RiskScore risk={active?.risk ?? loans[0]?.risk ?? null}/></SectionCard></div>
    <SectionCard title="Loan portfolio & repayment schedule" eyebrow="Amortization engine" action={<PrintButton/>}><div className="space-y-5">{loans.map((loan) => <div key={loan.loan_id} className="rounded-[20px] border border-slate-700/25 bg-slate-950/20 p-4 md:p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="text-base font-semibold text-white">{loan.purpose}</p><Badge value={loan.status}/></div><p className="mt-2 text-xs text-slate-500">{formatCurrency(Number(loan.principal_amount))} · {(Number(loan.annual_interest_rate)*100).toFixed(2)}% p.a. · {loan.term_months} months</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><FileText size={14}/> ID {loan.loan_id.slice(0,8).toUpperCase()}</div></div><CollateralList items={loan.collateral} loanId={loan.loan_id} reviewable={["pending","under_review"].includes(loan.status)}/>{["pending","under_review"].includes(loan.status)&&<CollateralForm loanId={loan.loan_id}/>} {loan.repayments.length > 0 && <div className="table-shell mt-5"><table className="data-table"><thead><tr><th>#</th><th>Due date</th><th>Principal</th><th>Interest</th><th>Total</th><th>Status / action</th></tr></thead><tbody>{loan.repayments.map((r) => <tr key={r.repayment_id}><td>{r.installment_number}</td><td>{formatDate(r.due_date)}</td><td>{formatCurrency(Number(r.principal_due))}</td><td>{formatCurrency(Number(r.interest_due))}</td><td className="font-semibold text-white">{formatCurrency(Number(r.total_due))}</td><td>{r.is_settled ? <Badge value="paid"/> : sourceAccount && loan.disbursed_at ? <RepaymentButton loanId={loan.loan_id} repaymentId={r.repayment_id} accounts={overview.accounts.filter(a => a.status === "active").map(a => ({ account_id: String(a.account_id), account_number: String(a.account_number) }))}/> : <span className="text-xs text-slate-600">Awaiting disbursement or active account</span>}</td></tr>)}</tbody></table></div>}</div>)}{!loans.length && <div className="py-12 text-center text-sm text-slate-600">No loan applications yet.</div>}</div></SectionCard>
  </div>;
}
