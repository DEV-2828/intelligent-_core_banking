"use client";
import { postJson } from "@/lib/http-client";
import { errorMessage } from "@/lib/errors";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function RepaymentButton({ loanId, repaymentId, sourceAccountId }: { loanId: string; repaymentId: string; sourceAccountId: string }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function pay() { setLoading(true); setError(""); try { await postJson(`/api/loans/${loanId}/repayments`, { repaymentId, sourceAccountId }); router.refresh(); } catch (error) { setError(errorMessage(error)); } finally { setLoading(false); } }
  return <div className="flex items-center gap-2"><button onClick={pay} disabled={loading} className="btn-primary min-w-20 py-2 text-xs">{loading ? <Loader2 size={14} className="mx-auto animate-spin"/> : "Pay EMI"}</button>{error && <span className="text-[10px] text-rose-300">{error}</span>}</div>;
}
