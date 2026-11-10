import {bankingRoute} from "@/lib/api";
import {transfer} from "@/lib/banking";
export async function POST(request:Request){return bankingRoute(request,["customer"],async(user,key)=>{const result=await transfer(user,key,await request.json());return result;});}
