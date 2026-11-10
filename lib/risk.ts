import { ObjectId } from "mongodb";
import type {Document} from "mongodb";
import { mongoDb } from "@/lib/mongodb";
import { calculateRisk } from "@/lib/risk-calculator";
import {financialPipeline} from "@/lib/risk-pipeline";
export { recommendedAnnualRate } from "@/lib/risk-calculator";
export async function getRiskMetrics(profileId: string) {
 if(!ObjectId.isValid(profileId)) return null;
 try {
 const rows=await (await mongoDb()).collection("credit_profiles").aggregate<{profile:Document;dscr:unknown;ocfMargin:unknown;currentRatio:unknown}>(financialPipeline(new ObjectId(profileId))).toArray();
 const row=rows[0];if(!row)return null;
 const risk=calculateRisk(row.profile,profileId,String(row.profile.borrower_id),String(row.profile.underwriting_status));
 const numeric=(value:unknown)=>value===null?null:Number(String(value));
 return {...risk,dscr:numeric(row.dscr),ocfMargin:numeric(row.ocfMargin)??risk.ocfMargin,currentRatio:numeric(row.currentRatio)};
 } catch { return null; }
}
export async function getRiskProfileForBorrower(borrowerId: string) { return (await mongoDb()).collection("credit_profiles").findOne({borrower_id:borrowerId}); }
