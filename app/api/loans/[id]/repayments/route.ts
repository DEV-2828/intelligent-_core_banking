import {bankingRoute} from "@/lib/api";
import {payInstallment} from "@/lib/banking";
import {tryLoanSync} from "@/lib/loan-sync";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return bankingRoute(request,["customer"],async(user,key)=>{const {id}=await params;const {repaymentId,sourceAccountId}=await request.json();const result=await payInstallment(user,key,id,String(repaymentId),String(sourceAccountId));await tryLoanSync();return result;});}
