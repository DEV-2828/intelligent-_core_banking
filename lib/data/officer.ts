import type { RowDataPacket } from "mysql2";
import type { LoanRow } from "@/lib/types";
import { db } from "@/lib/mysql";
import { getRiskMetrics } from "@/lib/risk";

export async function getOfficerDashboard(officerId: string) {
  const [applications] = await db.query<(LoanRow & { borrower_name: string; borrower_email: string; collateral_value: number | null })[]>(`
    SELECT l.*, CONCAT(u.first_name,' ',u.last_name) borrower_name, u.email borrower_email,
           c.collateral_type, c.estimated_value collateral_value
    FROM loans l
    JOIN users u ON u.user_id=l.borrower_id
    LEFT JOIN collateral c ON c.loan_id=l.loan_id
    WHERE l.status IN ('pending','under_review')
    ORDER BY l.created_at ASC`);

  const enriched = await Promise.all(applications.map(async (loan) => ({
    ...loan,
    risk: await getRiskMetrics(loan.mongodb_credit_profile_id),
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
