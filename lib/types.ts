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
  dscr: number;
  ocfMargin: number;
  currentRatio: number;
  riskScore: number;
  riskTier: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
};
