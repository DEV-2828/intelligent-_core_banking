CREATE OR REPLACE VIEW vw_loan_positions AS
SELECT l.*, GREATEST(l.principal_amount-COALESCE(r.principal_paid,0),0) outstanding_principal,
 COALESCE(r.overdue_amount,0) overdue_amount, COALESCE(r.overdue_installments,0) overdue_installments,
 COALESCE(GREATEST(DATEDIFF(CURDATE(),r.oldest_overdue),0),0) days_overdue
FROM loans l LEFT JOIN (
 SELECT loan_id,SUM(CASE WHEN is_settled THEN principal_due ELSE 0 END) principal_paid,
 SUM(CASE WHEN NOT is_settled AND due_date<CURDATE() THEN total_due-amount_paid ELSE 0 END) overdue_amount,
 SUM(CASE WHEN NOT is_settled AND due_date<CURDATE() THEN 1 ELSE 0 END) overdue_installments,
 MIN(CASE WHEN NOT is_settled AND due_date<CURDATE() THEN due_date END) oldest_overdue
 FROM loan_repayments GROUP BY loan_id
) r ON r.loan_id=l.loan_id;
CREATE OR REPLACE VIEW vw_executive_portfolio_summary AS
SELECT
 (SELECT COUNT(*) FROM users WHERE role='customer' AND is_active=TRUE) active_customers,
 (SELECT COUNT(*) FROM accounts WHERE status='active') active_accounts,
 (SELECT COALESCE(SUM(balance),0) FROM accounts WHERE status='active' AND type IN ('checking','savings')) customer_deposits,
 (SELECT COUNT(*) FROM loans WHERE status IN ('approved','active')) approved_or_active_loans,
 (SELECT COALESCE(SUM(outstanding_principal),0) FROM vw_loan_positions WHERE status IN ('approved','active','defaulted')) loan_exposure,
 (SELECT COUNT(*) FROM loans WHERE status='defaulted') defaulted_loans,
 (SELECT COUNT(*) FROM vw_loan_positions WHERE days_overdue>0 AND status IN ('active','defaulted') AND disbursed_at IS NOT NULL) overdue_loans,
 (SELECT COUNT(*) FROM transactions WHERE status='completed') completed_transactions;
