import {bankingRoute} from "@/lib/api";
import {disburseLoan} from "@/lib/banking";
import {tryLoanSync} from "@/lib/loan-sync";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return bankingRoute(request,["loan_officer","risk_admin"],async(user,key)=>{const {id}=await params;const result=await disburseLoan(user,key,id);await tryLoanSync();return result;});}
