"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";

export function LoanDecisionActions({ loanId }: { loanId: string }) {
  const router = useRouter(); const [loading, setLoading] = useState<"approve"|"reject"|null>(null); const [error, setError] = useState("");
  async function decide(decision: "approve"|"reject") { setLoading(decision); setError(""); const res = await fetch(`/api/officer/loans/${loanId}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) }); const data = await res.json(); setLoading(null); if (!res.ok) return setError(data.error ?? "Action failed"); router.refresh(); }
  return <div><div className="flex gap-2"><button disabled={!!loading} onClick={() => decide("reject")} className="btn-secondary flex items-center gap-2 text-xs text-rose-300">{loading === "reject" ? <Loader2 size={14} className="animate-spin"/> : <X size={14}/>} Reject</button><button disabled={!!loading} onClick={() => decide("approve")} className="btn-primary flex items-center gap-2 text-xs">{loading === "approve" ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Approve & generate EMI</button></div>{error && <p className="mt-2 text-[10px] text-rose-300">{error}</p>}</div>;
}
