import {bankingRoute} from "@/lib/api";import {manageBeneficiary} from "@/lib/beneficiaries";
export async function POST(request:Request){return bankingRoute(request,["customer","risk_admin"],async(user,key)=>manageBeneficiary(user,key,await request.json()));}
