import {randomUUID} from "node:crypto";import type {RowDataPacket} from "mysql2";import type {SessionUser} from "@/lib/types";import {BankingError,money,withOperation} from "@/lib/operations";
export async function manageCollateral(user:SessionUser,key:string,loanId:string,input:{action:unknown;collateralId?:unknown;type?:unknown;description?:unknown;value?:unknown;valuationDate?:unknown}){
 const action=String(input.action),id=String(input.collateralId??"");if(!["add","remove","verify"].includes(action))throw new BankingError("Invalid collateral action");
 if(action==="verify"?!["loan_officer","risk_admin"].includes(user.role):user.role!=="customer")throw new BankingError("Access denied",403);
 return withOperation(user.userId,key,"collateral",{loanId,...input},async c=>{
 const [loans]=await c.query<RowDataPacket[]>("SELECT * FROM loans WHERE loan_id=? FOR UPDATE",[loanId]);const loan=loans[0];if(!loan)throw new BankingError("Loan not found",404);
 if(user.role==="customer"&&loan.borrower_id!==user.userId)throw new BankingError("Access denied",403);
 if(!["pending","under_review"].includes(loan.status))throw new BankingError("Collateral can only change before the credit decision",409);
 if(action==="add"){
 const type=String(input.type),description=String(input.description??"").trim(),value=money(input.value),date=String(input.valuationDate??"");
 if(!["property","vehicle","equipment","deposit","inventory","other"].includes(type)||!description||description.length>500||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>new Date().toISOString().slice(0,10))throw new BankingError("Enter valid collateral details and a valuation date that is not in the future");
 const collateralId=randomUUID();await c.query("INSERT INTO collateral(collateral_id,loan_id,collateral_type,description,estimated_value,valuation_date) VALUES(?,?,?,?,?,?)",[collateralId,loanId,type,description,value,date]);return {ok:true,collateralId};
 }
 const [assets]=await c.query<RowDataPacket[]>("SELECT * FROM collateral WHERE collateral_id=? AND loan_id=? FOR UPDATE",[id,loanId]);if(!assets.length)throw new BankingError("Collateral not found",404);
 if(action==="remove"){if(assets[0].status!=="proposed")throw new BankingError("Verified collateral cannot be removed",409);await c.query("DELETE FROM collateral WHERE collateral_id=?",[id]);}
 else{await c.query("UPDATE collateral SET status='verified' WHERE collateral_id=?",[id]);await c.query("INSERT INTO security_logs(user_id,event_type,details) VALUES(?,'collateral_verified',?)",[user.userId,"Verified collateral "+id+" for loan "+loanId]);}
 return {ok:true,collateralId:id};
 });
}
