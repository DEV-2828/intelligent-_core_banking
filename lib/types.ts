export type UserRole = "customer" | "loan_officer" | "risk_admin";

export type SessionUser = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export type RiskMetrics = {
  profileId: string;
  borrowerId: string;
  legalName: string;
  entityType: string;
  underwritingStatus: string;
  bureauScore: number;
  delinquencies: number;
  dscr: number | null;
  ocfMargin: number;
  currentRatio: number | null;
  inputs?: import("./risk-calculator").FinancialProfile;
  modelVersion: string;
  assessedAt: string;
  riskScore: number;
  riskTier: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
};

export type LoanRow = import("mysql2").RowDataPacket & {
  loan_id: string; borrower_id: string; officer_id: string | null;
  mongodb_credit_profile_id: string; principal_amount: number;
  annual_interest_rate: number; term_months: number; purpose: string;
  disbursed_at: string | null; assessment_snapshot: RiskMetrics | string | null;
  status: string; created_at: string; updated_at: string; officer_name?: string;
};
export type RepaymentRow = import("mysql2").RowDataPacket & {
  repayment_id: string; loan_id: string; installment_number: number;
  due_date: string; principal_due: number; interest_due: number;
  total_due: number; amount_paid: number; is_settled: boolean;
};
export type TransferAccount = { account_id: string; account_number: string; balance: number; status: string; };
export type Beneficiary = { beneficiary_id: string; account_id: string; account_number: string; nickname: string | null; beneficiary_name: string; is_verified: boolean; };

export type CollateralRow = import("mysql2").RowDataPacket & {collateral_id:string;loan_id:string;collateral_type:string;description:string;estimated_value:number;valuation_date:string;status:string};
