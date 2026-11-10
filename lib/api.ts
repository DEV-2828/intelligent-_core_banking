import {NextResponse} from "next/server";
import {getSessionUser} from "@/lib/auth";
import {BankingError} from "@/lib/operations";
import type {SessionUser,UserRole} from "@/lib/types";
export async function bankingRoute(request:Request,roles:UserRole[],action:(user:SessionUser,key:string)=>Promise<object>){
 try {
 const origin=request.headers.get("origin");if((origin&&origin!==new URL(request.url).origin)||request.headers.get("sec-fetch-site")==="cross-site")throw new BankingError("Cross-site request rejected",403);
 const user=await getSessionUser();if(!user)throw new BankingError("Sign in to continue",401);if(!roles.includes(user.role))throw new BankingError("Access denied",403);
 return NextResponse.json(await action(user,request.headers.get("idempotency-key")??""));
 }catch(error){
 if(error instanceof BankingError)return NextResponse.json({error:error.message},{status:error.status});
 const code=error&&typeof error==="object"&&"code" in error?String(error.code):"";
 if(code==="ER_SIGNAL_EXCEPTION")return NextResponse.json({error:error instanceof Error?error.message:"Banking operation rejected"},{status:409});
 if(error instanceof SyntaxError)return NextResponse.json({error:"Invalid request body"},{status:400});
 console.error(error);return NextResponse.json({error:"The operation could not be completed. Please retry."},{status:503});
 }
}
