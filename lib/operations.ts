import { createHash } from "node:crypto";
import type { PoolConnection,RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/mysql";
export class BankingError extends Error { status:number; constructor(message:string,status=400){super(message);this.status=status;} }
export async function withOperation<T extends object>(actorId:string,key:string,operation:string,input:unknown,action:(connection:PoolConnection)=>Promise<T>):Promise<T> {
 if(!/^[A-Za-z0-9_-]{8,64}$/.test(key))throw new BankingError("A valid Idempotency-Key is required");
 const hash=createHash("sha256").update(JSON.stringify(input)).digest("hex");
 const c=await db.getConnection();
 try {
 await c.query("SET @app_user_id=?, @workflow_transaction=1",[actorId]);await c.beginTransaction();
 await c.query("INSERT INTO operation_requests(actor_id,operation,request_key,request_hash) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE request_key=VALUES(request_key)",[actorId,operation,key,hash]);
 const [rows]=await c.query<RowDataPacket[]>("SELECT request_hash,response FROM operation_requests WHERE actor_id=? AND operation=? AND request_key=? FOR UPDATE",[actorId,operation,key]);
 const row=rows[0];if(row.request_hash!==hash)throw new BankingError("This request key was used for different details",409);
 if(row.response){await c.commit();return (typeof row.response==="string"?JSON.parse(row.response):row.response) as T;}
 const result=await action(c);
 await c.query("UPDATE operation_requests SET response=? WHERE actor_id=? AND operation=? AND request_key=?",[JSON.stringify(result),actorId,operation,key]);
 await c.commit();return result;
 }catch(error){await c.rollback();throw error;}finally{try{await c.query("SET @app_user_id=NULL,@workflow_transaction=NULL");c.release();}catch{c.destroy();}}
}
export function money(value:unknown,min=0.01) {const n=typeof value==="number"?value:typeof value==="string"&&value.trim()?Number(value):NaN;if(!Number.isFinite(n)||n<min||n>1e12||Math.abs(n*100-Math.round(n*100))>0.0001)throw new BankingError("Enter a valid amount with at most two decimal places");return n;}
