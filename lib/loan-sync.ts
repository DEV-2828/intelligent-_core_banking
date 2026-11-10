import type {RowDataPacket} from "mysql2";
import type {Db} from "mongodb";
import {db} from "@/lib/mysql";
import {mongoDb} from "@/lib/mongodb";
export async function deliverLoanEvents(limit=25,target?:Db) {
 let delivered=0,failed=0;
 for(let i=0;i<Math.min(limit,100);i++) {
 const c=await db.getConnection();
 try {await c.beginTransaction();const [rows]=await c.query<RowDataPacket[]>("SELECT * FROM loan_sync_events WHERE delivered_at IS NULL ORDER BY created_at,event_id LIMIT 1 FOR UPDATE SKIP LOCKED");
 const event=rows[0];if(!event){await c.commit();break;}
 try {const payload=typeof event.payload==="string"?JSON.parse(event.payload):event.payload;
 const mdb=target??await mongoDb();
 await mdb.collection<{_id:string;version:number}>("loan_assessments").updateOne({_id:event.loan_id},[{$replaceWith:{$cond:[{$gte:[{$ifNull:["$version",0]},event.version]},"$$ROOT",{$mergeObjects:["$$ROOT",{$literal:payload}]}]}}],{upsert:true});
 await c.query("UPDATE loan_sync_events SET delivered_at=CURRENT_TIMESTAMP,attempts=attempts+1,last_error=NULL WHERE event_id=?",[event.event_id]);delivered++;
 }catch {await c.query("UPDATE loan_sync_events SET attempts=attempts+1,last_error='Credit store unavailable; retry required' WHERE event_id=?",[event.event_id]);failed++;}
 await c.commit(); if(failed)break;
 }catch(error){await c.rollback();throw error;}finally{c.release();}
 }
 return {delivered,failed};
}
export async function tryLoanSync() {try{return await deliverLoanEvents();}catch{return {delivered:0,failed:1};}}
