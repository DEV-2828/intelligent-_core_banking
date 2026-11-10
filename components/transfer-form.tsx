"use client";
import { errorMessage } from "@/lib/errors";
import { postJson } from "@/lib/http-client";


import type { TransferAccount, Beneficiary } from "@/lib/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { formatCurrency, maskAccount } from "@/lib/format";

export function TransferForm({ accounts, beneficiaries }: { accounts: TransferAccount[]; beneficiaries: Beneficiary[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setMessage(null);
    const element = e.currentTarget;
    const form = new FormData(element);
    try {
    const body = { sourceAccountId: form.get("source"), destinationAccountId: form.get("destination"), amount: Number(form.get("amount")), description: form.get("description") };
    const data = await postJson<{ transactionId: string }>("/api/transfers", body); setLoading(false);
    setMessage({ ok: true, text: `Transfer completed • ${data.transactionId?.slice(0, 8).toUpperCase()}` });
    element.reset(); router.refresh();
    } catch (error) { setMessage({ ok: false, text: errorMessage(error) }); } finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      <label><span className="mb-2 block text-xs font-semibold text-slate-400">From account</span><select className="input" name="source" required defaultValue=""><option value="" disabled>Select account</option>{accounts.map(a => <option key={a.account_id} value={a.account_id}>{maskAccount(a.account_number)} · {formatCurrency(Number(a.balance))}</option>)}</select></label>
      <label><span className="mb-2 block text-xs font-semibold text-slate-400">Verified beneficiary</span><select className="input" name="destination" required defaultValue=""><option value="" disabled>Select beneficiary</option>{beneficiaries.filter(b => b.is_verified).map(b => <option key={b.account_id} value={b.account_id}>{b.nickname || b.beneficiary_name} · {maskAccount(b.account_number)}</option>)}</select></label>
    </div>
    <div className="grid gap-4 md:grid-cols-[.7fr_1.3fr]"><label><span className="mb-2 block text-xs font-semibold text-slate-400">Amount</span><input className="input" name="amount" type="number" min="1" step="0.01" placeholder="₹ 0.00" required /></label><label><span className="mb-2 block text-xs font-semibold text-slate-400">Description</span><input className="input" name="description" maxLength={500} placeholder="Invoice payment, family transfer..." /></label></div>
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-400/10 bg-emerald-400/[.035] p-4 sm:flex-row sm:items-center"><div className="flex gap-3"><ShieldCheck className="mt-0.5 text-emerald-300" size={18}/><div><p className="text-xs font-semibold text-emerald-200">Protected by atomic ledger transfer</p><p className="mt-1 text-[11px] text-slate-500">Row locks, minimum-balance validation and automatic audit logging.</p></div></div><button disabled={loading || !beneficiaries.length} className="btn-primary flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" size={16}/> : <>Transfer funds <ArrowRight size={15}/></>}</button></div>
    {message && <div className={`rounded-xl border px-4 py-3 text-xs ${message.ok ? "border-emerald-400/15 bg-emerald-400/[.05] text-emerald-300" : "border-rose-400/15 bg-rose-400/[.05] text-rose-300"}`}>{message.text}</div>}
  </form>;
}
