import {randomUUID} from "node:crypto";
import type {PoolConnection,RowDataPacket} from "mysql2/promise";
import type {SessionUser,RiskMetrics} from "@/lib/types";
import {getRiskProfileForBorrower} from "@/lib/risk";
import {calculateRisk,recommendedAnnualRate} from "@/lib/risk-calculator";
import {BankingError,money,withOperation} from "@/lib/operations";
function assess(...args: Parameters<typeof calculateRisk>) {try{return calculateRisk(...args);}catch(error){throw new BankingError(error instanceof Error?error.message:"Financial profile is invalid");}}
function customer(user:SessionUser){if(user.role!=="customer")throw new BankingError("Customer access required",403);}
function officer(user:SessionUser){if(!["loan_officer","risk_admin"].includes(user.role))throw new BankingError("Officer access required",403);}
async function account(c:PoolConnection,id:unknown,owner:string){const [rows]=await c.query<RowDataPacket[]>("SELECT * FROM accounts WHERE account_id=? AND user_id=? AND status='active'",[String(id??""),owner]);if(!rows.length)throw new BankingError("Choose your active account",403);return rows[0];}
export async function transfer(user:SessionUser,key:string,input:{sourceAccountId:unknown;destinationAccountId:unknown;amount:unknown;description?:unknown}){
 customer(user);const amount=money(input.amount),source=String(input.sourceAccountId??""),destination=String(input.destinationAccountId??""),description=String(input.description??"Bank transfer").slice(0,500);
 return withOperation(user.userId,key,"transfer",{source,destination,amount,description},async c=>{
 const from=await account(c,source,user.userId);const [to]=await c.query<RowDataPacket[]>("SELECT * FROM accounts WHERE account_id=? AND status='active'",[destination]);
 if(!to.length||from.currency!==to[0].currency)throw new BankingError("Destination unavailable or currency differs");
 if(to[0].user_id!==user.userId){const [allowed]=await c.query<RowDataPacket[]>("SELECT beneficiary_id FROM beneficiaries WHERE user_id=? AND beneficiary_account_id=? AND is_verified=TRUE",[user.userId,destination]);if(!allowed.length)throw new BankingError("Destination must be a verified beneficiary",403);}
 await c.query("SET @transfer_id=NULL");await c.query("CALL sp_transfer_funds(?,?,?,?,@transfer_id)",[source,destination,amount,description]);const [ids]=await c.query<RowDataPacket[]>("SELECT @transfer_id AS id");return {ok:true,transactionId:String(ids[0].id)};
 });
}
export async function applyForLoan(user:SessionUser,key:string,input:{amount:unknown;termMonths:unknown;purpose:unknown;payoutAccountId:unknown}){
 customer(user);const principal=money(input.amount,10000),term=Number(input.termMonths),purpose=typeof input.purpose==="string"?input.purpose.trim():"",payout=String(input.payoutAccountId??"");
 if(![12,18,24,36,48].includes(term)||!purpose||purpose.length>255)throw new BankingError("Enter a valid term and purpose");
 return withOperation(user.userId,key,"apply",{principal,term,purpose,payout},async c=>{
 const target=await account(c,payout,user.userId);if(target.currency!=="INR")throw new BankingError("Loan payout requires an INR account");
 const profile=await getRiskProfileForBorrower(user.userId);if(!profile)throw new BankingError("Complete your financial profile first");
 const risk=assess(profile,String(profile._id),user.userId,"UNDER_REVIEW"),loanId=randomUUID(),rate=recommendedAnnualRate(risk.riskTier);
 await c.query("INSERT INTO loans(loan_id,borrower_id,mongodb_credit_profile_id,principal_amount,annual_interest_rate,term_months,purpose,status,payout_account_id,assessment_snapshot) VALUES(?,?,?,?,?,?,?,'under_review',?,?)",[loanId,user.userId,String(profile._id),principal,rate,term,purpose,payout,JSON.stringify(risk)]);
 return {ok:true,loanId,riskTier:risk.riskTier,recommendedRate:rate};
 });
}
export async function decideLoan(user:SessionUser,key:string,loanId:string,decision:string,reason=""){
 officer(user);if(!["approve","reject"].includes(decision))throw new BankingError("Invalid decision");if(reason.length>500)throw new BankingError("Decision note is too long");
 return withOperation(user.userId,key,"decision",{loanId,decision,reason},async c=>{
 const [rows]=await c.query<RowDataPacket[]>("SELECT * FROM loans WHERE loan_id=? FOR UPDATE",[loanId]);const loan=rows[0];
 if(!loan||!["pending","under_review"].includes(loan.status))throw new BankingError("Loan is no longer awaiting review",409);
 let snapshot:RiskMetrics|undefined;
 if(decision==="approve") {const profile=await getRiskProfileForBorrower(loan.borrower_id);if(!profile||String(profile._id)!==loan.mongodb_credit_profile_id)throw new BankingError("Linked financial profile is unavailable");snapshot=assess(profile,String(profile._id),loan.borrower_id,"APPROVED");}
 await c.query("UPDATE loans SET status=?,officer_id=?,approved_at=?,decision_reason=?,assessment_snapshot=COALESCE(?,assessment_snapshot),annual_interest_rate=COALESCE(?,annual_interest_rate) WHERE loan_id=?",[decision==="approve"?"approved":"rejected",user.userId,decision==="approve"?new Date():null,reason||null,snapshot?JSON.stringify(snapshot):null,snapshot?recommendedAnnualRate(snapshot.riskTier):null,loanId]);
 return {ok:true,decision};
 });
}
export async function disburseLoan(user:SessionUser,key:string,loanId:string){
 officer(user);const bank=process.env.BANK_DISBURSEMENT_ACCOUNT_ID;if(!bank)throw new BankingError("Disbursement account is not configured",503);
 return withOperation(user.userId,key,"disburse",{loanId},async c=>{
 const [rows]=await c.query<RowDataPacket[]>("SELECT * FROM loans WHERE loan_id=? FOR UPDATE",[loanId]);const loan=rows[0];if(!loan)throw new BankingError("Loan not found",404);
 if(loan.disbursement_transaction_id)return {ok:true,transactionId:String(loan.disbursement_transaction_id)};
 // Older demo loans predate payout tracking. Require a fresh assessment and an owned active account before funding them.
 if(!loan.payout_account_id||!loan.assessment_snapshot){const profile=await getRiskProfileForBorrower(loan.borrower_id);if(!profile||String(profile._id)!==loan.mongodb_credit_profile_id)throw new BankingError("Complete the linked financial profile first");const risk=assess(profile,String(profile._id),loan.borrower_id,"APPROVED");const [targets]=await c.query<RowDataPacket[]>("SELECT account_id FROM accounts WHERE user_id=? AND status='active' AND currency='INR' ORDER BY created_at LIMIT 1",[loan.borrower_id]);if(!targets.length)throw new BankingError("Borrower has no eligible payout account");await c.query("UPDATE loans SET payout_account_id=?,assessment_snapshot=? WHERE loan_id=?",[loan.payout_account_id??targets[0].account_id,JSON.stringify(risk),loanId]);}
 await c.query("CALL sp_disburse_loan(?,?,?)",[loanId,user.userId,bank]);const [updated]=await c.query<RowDataPacket[]>("SELECT disbursement_transaction_id FROM loans WHERE loan_id=?",[loanId]);return {ok:true,transactionId:String(updated[0].disbursement_transaction_id)};
 });
}
export async function payInstallment(user:SessionUser,key:string,loanId:string,repaymentId:string,sourceAccountId:string){
 customer(user);const bank=process.env.BANK_REPAYMENT_ACCOUNT_ID;if(!bank)throw new BankingError("Repayment account is not configured",503);
 return withOperation(user.userId,key,"repayment",{loanId,repaymentId,sourceAccountId},async c=>{
 const [loans]=await c.query<RowDataPacket[]>("SELECT loan_id FROM loans WHERE loan_id=? AND borrower_id=? FOR UPDATE",[loanId,user.userId]);if(!loans.length)throw new BankingError("Loan is unavailable",403);
 const [rows]=await c.query<RowDataPacket[]>("SELECT loan_id,is_settled,transaction_id FROM loan_repayments WHERE repayment_id=? FOR UPDATE",[repaymentId]);const repayment=rows[0];if(!repayment||repayment.loan_id!==loanId)throw new BankingError("Invalid installment",403);
 await account(c,sourceAccountId,user.userId);if(repayment.is_settled)return {ok:true,transactionId:String(repayment.transaction_id)};
 await c.query("CALL sp_pay_loan_installment(?,?,?)",[repaymentId,sourceAccountId,bank]);const [updated]=await c.query<RowDataPacket[]>("SELECT transaction_id FROM loan_repayments WHERE repayment_id=?",[repaymentId]);return {ok:true,transactionId:String(updated[0].transaction_id)};
 });
}
