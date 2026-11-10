"use client";
import {useRequestKey} from "@/components/use-request-key";
import { errorMessage } from "@/lib/errors";
import { postJson } from "@/lib/http-client";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

export function LoanApplicationForm({accounts}: {accounts:{account_id:string;account_number:string}[]}) {
  const {keyFor,complete}=useRequestKey();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setMessage(null);
    const element = e.currentTarget;
    const form = new FormData(element);
    try {
    const body={ amount: Number(form.get("amount")), termMonths: Number(form.get("term")), purpose: form.get("purpose"), payoutAccountId: form.get("payout") };
    const data = await postJson<{ riskTier: string; recommendedRate: number }>("/api/loans", body, keyFor(body)); setLoading(false);
    setMessage({ ok: true, text: `Application created. Provisional risk tier: ${data.riskTier}; recommended rate ${(data.recommendedRate * 100).toFixed(2)}% p.a.` });
    complete(); element.reset(); router.refresh();
    } catch (error) { setMessage({ ok: false, text: errorMessage(error) }); } finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <label className="block">Payout account<select className="input" name="payout" required>{accounts.map(a=><option key={a.account_id} value={a.account_id}>{a.account_number}</option>)}</select></label><div className="grid gap-4 md:grid-cols-2"><label><span className="mb-2 block text-xs font-semibold text-slate-400">Requested amount</span><input name="amount" type="number" min="10000" step="1000" className="input" placeholder="₹ 500,000" required /></label><label><span className="mb-2 block text-xs font-semibold text-slate-400">Term</span><select name="term" className="input" defaultValue="24"><option value="12">12 months</option><option value="18">18 months</option><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option></select></label></div>
    <label><span className="mb-2 block text-xs font-semibold text-slate-400">Purpose</span><textarea name="purpose" className="input min-h-24 resize-none" maxLength={255} placeholder="Working capital, machinery purchase, expansion..." required /></label>
    <div className="flex flex-col gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.035] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs text-cyan-200"><Sparkles size={15}/> Rate recommendation uses your MongoDB credit-risk profile.</div><button className="btn-primary" disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin"/> : "Submit for underwriting"}</button></div>
    {message && <div className={`rounded-xl border px-4 py-3 text-xs ${message.ok ? "border-emerald-400/15 bg-emerald-400/[.05] text-emerald-300" : "border-rose-400/15 bg-rose-400/[.05] text-rose-300"}`}>{message.text}</div>}
  </form>;
}
