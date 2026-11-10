"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {postJson} from "@/lib/http-client";
import {errorMessage} from "@/lib/errors";
import {useRequestKey} from "@/components/use-request-key";
export function LoanDecisionActions({loanId,status}:{loanId:string;status:string}){
 const [loading,setLoading]=useState(false),[error,setError]=useState(""),[reason,setReason]=useState("");const router=useRouter(),{keyFor,complete}=useRequestKey();
 async function act(action:string){setLoading(true);setError("");const body={decision:action,reason};try{await postJson("/api/officer/loans/"+loanId+"/"+(action==="disburse"?"disburse":"decision"),body,keyFor({loanId,...body}));complete();router.refresh();}catch(e){setError(errorMessage(e));}finally{setLoading(false);}}
 return <div className="space-y-3">{["pending","under_review"].includes(status)?<><label className="block text-xs text-slate-400">Decision note<textarea className="input" maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="flex gap-3"><button className="btn-secondary" disabled={loading} onClick={()=>act("reject")}>Reject</button><button className="btn-primary" disabled={loading} onClick={()=>act("approve")}>Approve loan</button></div></>:<button className="btn-primary" disabled={loading} onClick={()=>act("disburse")}>{loading?"Processing…":"Disburse funds & create EMIs"}</button>}{error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}</div>;
}
