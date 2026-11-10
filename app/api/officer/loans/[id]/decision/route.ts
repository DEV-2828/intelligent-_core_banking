import {bankingRoute} from "@/lib/api";
import {decideLoan} from "@/lib/banking";
import {tryLoanSync} from "@/lib/loan-sync";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return bankingRoute(request,["loan_officer","risk_admin"],async(user,key)=>{const {id}=await params;const {decision,reason}=await request.json();const result=await decideLoan(user,key,id,String(decision),String(reason??""));await tryLoanSync();return result;});}
