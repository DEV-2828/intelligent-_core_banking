import { requireUser } from "@/lib/auth";
import { getCustomerTransferData } from "@/lib/data/customer";
import { SectionCard } from "@/components/section-card";
import { TransferForm } from "@/components/transfer-form";
import { Badge } from "@/components/badge";
import { maskAccount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransferPage() {
  const user = await requireUser(["customer"]);
  const { accounts, beneficiaries } = await getCustomerTransferData(user.userId);
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-cyan-300/65">Payments</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.035em] text-white">Move money securely</h1><p className="mt-2 text-sm text-slate-500">Transfers execute through the database stored procedure with row-level locking and rollback protection.</p></div><div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><SectionCard title="New bank transfer" eyebrow="Atomic transaction"><TransferForm accounts={accounts} beneficiaries={beneficiaries}/></SectionCard><SectionCard title="Verified beneficiaries" eyebrow="Trusted payees"><div className="space-y-3">{beneficiaries.map(b => <div key={b.beneficiary_id} className="rounded-2xl border border-slate-700/25 bg-slate-950/20 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-200">{b.nickname || b.beneficiary_name}</p><p className="mt-1 text-[11px] text-slate-600">{b.beneficiary_name} · {maskAccount(b.account_number)}</p></div><Badge value={b.is_verified ? "verified" : "pending"}/></div></div>)}{!beneficiaries.length && <p className="py-8 text-center text-xs text-slate-600">No beneficiaries configured in the database.</p>}</div></SectionCard></div></div>;
}
