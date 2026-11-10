import { ObjectId } from "mongodb";
import { mongoDb } from "@/lib/mongodb";
import { calculateRisk } from "@/lib/risk-calculator";
export { recommendedAnnualRate } from "@/lib/risk-calculator";
export async function getRiskMetrics(profileId: string) {
 if(!ObjectId.isValid(profileId)) return null;
 try {const profile=await (await mongoDb()).collection("credit_profiles").findOne({_id:new ObjectId(profileId)});
 return profile?calculateRisk(profile,profileId,String(profile.borrower_id),String(profile.underwriting_status)):null;
 } catch { return null; }
}
export async function getRiskProfileForBorrower(borrowerId: string) { return (await mongoDb()).collection("credit_profiles").findOne({borrower_id:borrowerId}); }
