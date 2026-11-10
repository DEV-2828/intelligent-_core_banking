import {bankingRoute} from "@/lib/api";
import {applyForLoan} from "@/lib/banking";
import {tryLoanSync} from "@/lib/loan-sync";
export async function POST(request:Request){return bankingRoute(request,["customer"],async(user,key)=>{const result=await applyForLoan(user,key,await request.json());await tryLoanSync();return result;});}
