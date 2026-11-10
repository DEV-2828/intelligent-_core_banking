import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/mysql";

export async function getAdminDashboard() {
  const [summaryRows] = await db.query<RowDataPacket[]>(`SELECT * FROM vw_executive_portfolio_summary`);
  const [txTrend] = await db.query<RowDataPacket[]>(`
    SELECT DATE_FORMAT(created_at,'%Y-%m') month, COUNT(*) count, COALESCE(SUM(amount),0) volume
    FROM transactions WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY month`);
  const [loanDistribution] = await db.query<RowDataPacket[]>(`
    SELECT status, COUNT(*) count, COALESCE(SUM(principal_amount),0) exposure
    FROM loans GROUP BY status ORDER BY count DESC`);
  const [audit] = await db.query<RowDataPacket[]>(`
    SELECT a.audit_id, a.old_balance, a.new_balance, a.delta_amount, a.changed_at,
           ac.account_number, CONCAT(u.first_name,' ',u.last_name) customer_name
    FROM account_audit_log a
    JOIN accounts ac ON ac.account_id=a.account_id
    JOIN users u ON u.user_id=ac.user_id
    ORDER BY a.changed_at DESC LIMIT 8`);
  const [accounts] = await db.query<RowDataPacket[]>(`
    SELECT a.account_id, a.account_number, a.type, a.status, a.balance,
           CONCAT(u.first_name,' ',u.last_name) customer_name
    FROM accounts a JOIN users u ON u.user_id=a.user_id
    WHERE u.role='customer' ORDER BY a.updated_at DESC LIMIT 10`);
  const [sync]=await db.query<RowDataPacket[]>("SELECT COUNT(*) pending FROM loan_sync_events WHERE delivered_at IS NULL");
  const [pendingBeneficiaries]=await db.query<RowDataPacket[]>("SELECT b.beneficiary_id,b.nickname,a.account_number,CONCAT(u.first_name,' ',u.last_name) customer_name FROM beneficiaries b JOIN accounts a ON a.account_id=b.beneficiary_account_id JOIN users u ON u.user_id=b.user_id WHERE b.is_verified=FALSE ORDER BY b.created_at");
  return {pendingBeneficiaries, pendingSync:Number(sync[0].pending), summary: summaryRows[0], txTrend, loanDistribution, audit, accounts };
}
