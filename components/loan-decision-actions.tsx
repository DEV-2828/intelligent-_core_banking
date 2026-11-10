"use client";
import { postJson } from "@/lib/http-client";
import { errorMessage } from "@/lib/errors";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";

export function LoanDecisionActions({ loanId }: { loanId: string }) {
  const router = useRouter(); const [loading, setLoading] = useState<"approve"|"reject"|null>(null); const [error, setError] = useState("");
  async function decide(decision: "approve"|"reject") { setLoading(decision); setError(""); try { await postJson(`/api/officer/loans/${loanId}/decision`, { decision }); router.refresh(); } catch (error) { setError(errorMessage(error)); } finally { setLoading(null); } }
  return <div><div className="flex gap-2"><button disabled={!!loading} onClick={() => decide("reject")} className="btn-secondary flex items-center gap-2 text-xs text-rose-300">{loading === "reject" ? <Loader2 size={14} className="animate-spin"/> : <X size={14}/>} Reject</button><button disabled={!!loading} onClick={() => decide("approve")} className="btn-primary flex items-center gap-2 text-xs">{loading === "approve" ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Approve & generate EMI</button></div>{error && <p className="mt-2 text-[10px] text-rose-300">{error}</p>}</div>;
}
