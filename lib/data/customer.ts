import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/mysql";
import { getRiskMetrics } from "@/lib/risk";

export async function getCustomerOverview(userId: string) {
  const [accounts] = await db.query<RowDataPacket[]>(`
    SELECT a.account_id, a.account_number, a.type, a.status, a.currency, a.balance,
           a.minimum_balance, b.branch_name, b.ifsc_code
    FROM accounts a JOIN branches b ON b.branch_id=a.branch_id
    WHERE a.user_id=? ORDER BY a.created_at`, [userId]);

  const [transactions] = await db.query<RowDataPacket[]>(`
    SELECT t.transaction_id, t.reference_number, t.type, t.amount, t.description, t.status,
           t.created_at, s.account_number source_number, d.account_number destination_number,
           s.user_id source_user_id, d.user_id destination_user_id
    FROM transactions t
    LEFT JOIN accounts s ON s.account_id=t.source_account_id
    LEFT JOIN accounts d ON d.account_id=t.destination_account_id
    WHERE s.user_id=? OR d.user_id=?
    ORDER BY t.created_at DESC LIMIT 8`, [userId, userId]);

  const [trend] = await db.query<RowDataPacket[]>(`
    SELECT DATE_FORMAT(t.created_at,'%Y-%m') month,
      SUM(CASE WHEN d.user_id=? THEN t.amount ELSE 0 END) inflow,
      SUM(CASE WHEN s.user_id=? THEN t.amount ELSE 0 END) outflow
    FROM transactions t
    LEFT JOIN accounts s ON s.account_id=t.source_account_id
    LEFT JOIN accounts d ON d.account_id=t.destination_account_id
    WHERE (s.user_id=? OR d.user_id=?) AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(t.created_at,'%Y-%m') ORDER BY month`, [userId, userId, userId, userId]);

  const [loanRows] = await db.query<RowDataPacket[]>(`
    SELECT l.*, (SELECT COUNT(*) FROM loan_repayments r WHERE r.loan_id=l.loan_id AND r.is_settled=0) remaining_installments,
      (SELECT MIN(due_date) FROM loan_repayments r WHERE r.loan_id=l.loan_id AND r.is_settled=0) next_due_date,
      (SELECT total_due FROM loan_repayments r WHERE r.loan_id=l.loan_id AND r.is_settled=0 ORDER BY installment_number LIMIT 1) next_due_amount
    FROM loans l WHERE l.borrower_id=? ORDER BY l.created_at DESC`, [userId]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  return { accounts, transactions, trend, loans: loanRows, totalBalance };
}

export async function getCustomerTransferData(userId: string) {
  const [accounts] = await db.query<RowDataPacket[]>(`
    SELECT account_id, account_number, type, balance, currency, status
    FROM accounts WHERE user_id=? AND status='active' ORDER BY created_at`, [userId]);
  const [beneficiaries] = await db.query<RowDataPacket[]>(`
    SELECT b.beneficiary_id, b.nickname, b.is_verified, a.account_id, a.account_number,
           a.type, CONCAT(u.first_name,' ',u.last_name) beneficiary_name
    FROM beneficiaries b
    JOIN accounts a ON a.account_id=b.beneficiary_account_id
    JOIN users u ON u.user_id=a.user_id
    WHERE b.user_id=? ORDER BY b.created_at DESC`, [userId]);
  return { accounts, beneficiaries };
}

export async function getCustomerLoans(userId: string) {
  const [loans] = await db.query<RowDataPacket[]>(`
    SELECT l.*, CONCAT(o.first_name,' ',o.last_name) officer_name
    FROM loans l LEFT JOIN users o ON o.user_id=l.officer_id
    WHERE l.borrower_id=? ORDER BY l.created_at DESC`, [userId]);

  const [repayments] = await db.query<RowDataPacket[]>(`
    SELECT r.* FROM loan_repayments r JOIN loans l ON l.loan_id=r.loan_id
    WHERE l.borrower_id=? ORDER BY r.loan_id, r.installment_number`, [userId]);

  const grouped = new Map<string, RowDataPacket[]>();
  repayments.forEach((r) => grouped.set(r.loan_id, [...(grouped.get(r.loan_id) ?? []), r]));

  const result = await Promise.all(loans.map(async (loan) => ({
    ...loan,
    repayments: grouped.get(loan.loan_id) ?? [],
    risk: await getRiskMetrics(loan.mongodb_credit_profile_id),
  })));
  return result;
}
