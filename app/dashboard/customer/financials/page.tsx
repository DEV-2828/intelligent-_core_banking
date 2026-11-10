import {requireUser} from "@/lib/auth";
import {FinancialProfileForm} from "@/components/financial-profile-form";
import {SectionCard} from "@/components/section-card";
export default async function FinancialsPage(){await requireUser(["customer"]);return <SectionCard title="Business financial profile" eyebrow="Credit assessment"><FinancialProfileForm/></SectionCard>;}
