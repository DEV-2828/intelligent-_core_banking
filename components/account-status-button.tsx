"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Unlock } from "lucide-react";

export function AccountStatusButton({ accountId, status }: { accountId: string; status: string }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const frozen = status === "frozen";
  async function toggle() { setLoading(true); const res = await fetch(`/api/admin/accounts/${accountId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: frozen ? "active" : "frozen" }) }); setLoading(false); if (res.ok) router.refresh(); }
  return <button onClick={toggle} disabled={loading} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${frozen ? "border-emerald-400/15 bg-emerald-400/[.05] text-emerald-300" : "border-rose-400/15 bg-rose-400/[.05] text-rose-300"}`}>{loading ? <Loader2 size={13} className="animate-spin"/> : <span className="flex items-center gap-1.5">{frozen ? <Unlock size={13}/> : <Lock size={13}/>} {frozen ? "Unfreeze" : "Freeze"}</span>}</button>;
}
