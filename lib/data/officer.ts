import type { RowDataPacket } from "mysql2";
import type { CollateralRow, LoanRow } from "@/lib/types";
import { db } from "@/lib/mysql";
import { getRiskMetrics } from "@/lib/risk";

export async function getOfficerDashboard(officerId: string) {
  const [applications] = await db.query<(LoanRow & { borrower_name: string; borrower_email: string; collateral_value: number | null })[]>(`
    SELECT l.*, CONCAT(u.first_name,' ',u.last_name) borrower_name, u.email borrower_email,
           (SELECT COALESCE(SUM(c.estimated_value),0) FROM collateral c WHERE c.loan_id=l.loan_id AND c.status='verified') collateral_value
    FROM loans l
    JOIN users u ON u.user_id=l.borrower_id

    WHERE l.status IN ('pending','under_review','approved') OR (l.status='active' AND l.disbursed_at IS NULL)
    ORDER BY l.created_at ASC`);

  const [collateral]=await db.query<CollateralRow[]>("SELECT * FROM collateral ORDER BY created_at");
  const enriched = await Promise.all(applications.map(async (loan) => ({
    ...loan,
    collateral:collateral.filter(c=>c.loan_id===loan.loan_id),
    risk: loan.assessment_snapshot ? (typeof loan.assessment_snapshot === "string" ? JSON.parse(loan.assessment_snapshot) : loan.assessment_snapshot) as import("@/lib/types").RiskMetrics : await getRiskMetrics(loan.mongodb_credit_profile_id),
  })));

  const [performance] = await db.query<RowDataPacket[]>(`
    SELECT * FROM vw_officer_loan_performance WHERE officer_id=?`, [officerId]);

  const [recent] = await db.query<RowDataPacket[]>(`
    SELECT l.loan_id, l.principal_amount, l.status, l.updated_at,
           CONCAT(u.first_name,' ',u.last_name) borrower_name
    FROM loans l JOIN users u ON u.user_id=l.borrower_id
    WHERE l.officer_id=? ORDER BY l.updated_at DESC LIMIT 6`, [officerId]);

  return { applications: enriched, performance: performance[0] ?? null, recent };
}
