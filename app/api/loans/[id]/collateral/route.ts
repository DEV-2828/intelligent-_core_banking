import {bankingRoute} from "@/lib/api";import {manageCollateral} from "@/lib/collateral";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return bankingRoute(request,["customer","loan_officer","risk_admin"],async(user,key)=>manageCollateral(user,key,(await params).id,await request.json()));}
