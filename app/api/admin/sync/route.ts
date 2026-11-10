import {bankingRoute} from "@/lib/api";
import {deliverLoanEvents} from "@/lib/loan-sync";
export async function POST(request:Request){return bankingRoute(request,["risk_admin"],()=>deliverLoanEvents(100));}
