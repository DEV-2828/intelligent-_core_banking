"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function RepaymentButton({ loanId, repaymentId, sourceAccountId }: { loanId: string; repaymentId: string; sourceAccountId: string }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function pay() { setLoading(true); setError(""); const res = await fetch(`/api/loans/${loanId}/repayments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repaymentId, sourceAccountId }) }); const data = await res.json(); setLoading(false); if (!res.ok) return setError(data.error ?? "Payment failed"); router.refresh(); }
  return <div className="flex items-center gap-2"><button onClick={pay} disabled={loading} className="btn-primary min-w-20 py-2 text-xs">{loading ? <Loader2 size={14} className="mx-auto animate-spin"/> : "Pay EMI"}</button>{error && <span className="text-[10px] text-rose-300">{error}</span>}</div>;
}
