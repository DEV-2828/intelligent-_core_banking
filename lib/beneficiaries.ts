import {randomUUID} from "node:crypto";import type {RowDataPacket} from "mysql2";import type {SessionUser} from "@/lib/types";import {BankingError,withOperation} from "@/lib/operations";
export async function manageBeneficiary(user:SessionUser,key:string,input:{action:unknown;beneficiaryId?:unknown;accountNumber?:unknown;nickname?:unknown}){
 const action=String(input.action),id=String(input.beneficiaryId??""),number=String(input.accountNumber??"").trim(),nickname=String(input.nickname??"").trim();
 if(!["add","remove","verify"].includes(action))throw new BankingError("Invalid beneficiary action");
 if(action==="verify"?user.role!=="risk_admin":user.role!=="customer")throw new BankingError("Access denied",403);
 return withOperation(user.userId,key,"beneficiary",{action,id,number,nickname},async c=>{
 if(action==="add"){
 if(!/^\d{6,34}$/.test(number)||!nickname||nickname.length>100)throw new BankingError("Enter a valid account number and nickname");
 const [accounts]=await c.query<RowDataPacket[]>("SELECT a.account_id,a.user_id FROM accounts a JOIN users u ON u.user_id=a.user_id WHERE a.account_number=? AND a.status='active' AND u.is_active=TRUE AND u.role='customer'",[number]);
 const target=accounts[0];if(!target||target.user_id===user.userId)throw new BankingError("Choose another customer's active account; use own-account transfer for your accounts");
 const beneficiaryId=randomUUID();await c.query("INSERT INTO beneficiaries(beneficiary_id,user_id,beneficiary_account_id,nickname,is_verified) VALUES(?,?,?,?,FALSE)",[beneficiaryId,user.userId,target.account_id,nickname]);return {ok:true,beneficiaryId};
 }
 const [rows]=await c.query<RowDataPacket[]>("SELECT * FROM beneficiaries WHERE beneficiary_id=? FOR UPDATE",[id]);const b=rows[0];if(!b)throw new BankingError("Beneficiary not found",404);
 if(action==="remove"){if(b.user_id!==user.userId)throw new BankingError("Access denied",403);await c.query("DELETE FROM beneficiaries WHERE beneficiary_id=?",[id]);}
 else {await c.query("UPDATE beneficiaries SET is_verified=TRUE WHERE beneficiary_id=?",[id]);await c.query("INSERT INTO security_logs(user_id,event_type,details) VALUES(?,'beneficiary_verified',?)",[user.userId,"Verified beneficiary "+id]);}
 return {ok:true,beneficiaryId:id};
 });
}
