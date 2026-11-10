-- Apply through npm run db:migrate after importing the base schema.
CREATE TABLE IF NOT EXISTS operation_requests (
 actor_id CHAR(36) NOT NULL, operation VARCHAR(32) NOT NULL, request_key VARCHAR(64) NOT NULL,
 request_hash CHAR(64) NOT NULL, response JSON NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(actor_id,operation,request_key), FOREIGN KEY(actor_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS loan_sync_events (
 event_id CHAR(36) PRIMARY KEY, loan_id CHAR(36) NOT NULL, version INT NOT NULL,
 payload JSON NOT NULL, attempts INT NOT NULL DEFAULT 0, last_error VARCHAR(500) NULL,
 delivered_at TIMESTAMP NULL, created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_loan_sync_version(loan_id,version), INDEX idx_sync_pending(delivered_at,created_at),
 FOREIGN KEY(loan_id) REFERENCES loans(loan_id)
) ENGINE=InnoDB;
DROP TRIGGER IF EXISTS trg_account_balance_audit;
DROP TRIGGER IF EXISTS trg_loan_version;
DROP TRIGGER IF EXISTS trg_loan_created_event;
DROP TRIGGER IF EXISTS trg_loan_changed_event;
DROP PROCEDURE IF EXISTS sp_transfer_funds;
DROP PROCEDURE IF EXISTS sp_approve_loan;
DROP PROCEDURE IF EXISTS sp_disburse_loan;
DROP PROCEDURE IF EXISTS sp_pay_loan_installment;
DELIMITER $$
CREATE TRIGGER trg_account_balance_audit AFTER UPDATE ON accounts FOR EACH ROW
BEGIN
 IF OLD.balance <> NEW.balance THEN
 INSERT INTO account_audit_log(account_id,old_balance,new_balance,delta_amount,operation_type,changed_by_app_user)
 VALUES(NEW.account_id,OLD.balance,NEW.balance,NEW.balance-OLD.balance,'UPDATE',COALESCE(@app_user_id,CURRENT_USER()));
 END IF;
END$$
CREATE TRIGGER trg_loan_version BEFORE UPDATE ON loans FOR EACH ROW
BEGIN
 IF OLD.status<>NEW.status OR NOT(OLD.assessment_snapshot <=> NEW.assessment_snapshot) THEN SET NEW.sync_version=OLD.sync_version+1; END IF;
END$$
CREATE TRIGGER trg_loan_created_event AFTER INSERT ON loans FOR EACH ROW
BEGIN
 INSERT INTO loan_sync_events(event_id,loan_id,version,payload) VALUES(UUID(),NEW.loan_id,NEW.sync_version,
 JSON_OBJECT('loan_id',NEW.loan_id,'borrower_id',NEW.borrower_id,'profile_id',NEW.mongodb_credit_profile_id,'status',NEW.status,'version',NEW.sync_version,'assessment',NEW.assessment_snapshot));
END$$
CREATE TRIGGER trg_loan_changed_event AFTER UPDATE ON loans FOR EACH ROW
BEGIN
 IF NEW.sync_version<>OLD.sync_version THEN
 INSERT INTO loan_sync_events(event_id,loan_id,version,payload) VALUES(UUID(),NEW.loan_id,NEW.sync_version,
 JSON_OBJECT('loan_id',NEW.loan_id,'borrower_id',NEW.borrower_id,'profile_id',NEW.mongodb_credit_profile_id,'status',NEW.status,'version',NEW.sync_version,'assessment',NEW.assessment_snapshot));
 END IF;
END$$
CREATE PROCEDURE sp_transfer_funds(
    IN p_source_account_id CHAR(36),
    IN p_destination_account_id CHAR(36),
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(500),
    OUT p_transaction_id CHAR(36)
)
BEGIN
    DECLARE v_source_balance DECIMAL(15,2);
    DECLARE v_source_minimum DECIMAL(15,2);
    DECLARE v_source_status VARCHAR(20);
    DECLARE v_destination_status VARCHAR(20);
    DECLARE v_lock_balance DECIMAL(15,2);
    DECLARE v_reference VARCHAR(64);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer amount must be greater than zero';
    END IF;

    IF p_source_account_id = p_destination_account_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Source and destination accounts must be different';
    END IF;

    IF COALESCE(@workflow_transaction,0)=0 THEN START TRANSACTION; END IF;

    -- Lock accounts in deterministic UUID order to reduce deadlock risk.
    IF p_source_account_id < p_destination_account_id THEN
        SELECT balance INTO v_lock_balance FROM accounts WHERE account_id = p_source_account_id FOR UPDATE;
        SELECT balance INTO v_lock_balance FROM accounts WHERE account_id = p_destination_account_id FOR UPDATE;
    ELSE
        SELECT balance INTO v_lock_balance FROM accounts WHERE account_id = p_destination_account_id FOR UPDATE;
        SELECT balance INTO v_lock_balance FROM accounts WHERE account_id = p_source_account_id FOR UPDATE;
    END IF;

    SELECT balance, minimum_balance, status
      INTO v_source_balance, v_source_minimum, v_source_status
      FROM accounts
     WHERE account_id = p_source_account_id;

    SELECT status
      INTO v_destination_status
      FROM accounts
     WHERE account_id = p_destination_account_id;

    IF v_source_status <> 'active' OR v_destination_status <> 'active' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Both accounts must be active';
    END IF;

    IF v_source_balance - p_amount < v_source_minimum THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient available balance after minimum-balance requirement';
    END IF;

    UPDATE accounts
       SET balance = balance - p_amount
     WHERE account_id = p_source_account_id;

    UPDATE accounts
       SET balance = balance + p_amount
     WHERE account_id = p_destination_account_id;

    SET p_transaction_id = UUID();
    SET v_reference = CONCAT('TXN-', REPLACE(UPPER(p_transaction_id), '-', ''));

    INSERT INTO transactions(
        transaction_id, reference_number, source_account_id,
        destination_account_id, type, amount, description, status
    ) VALUES (
        p_transaction_id, v_reference, p_source_account_id,
        p_destination_account_id, 'transfer', p_amount, p_description, 'completed'
    );

    IF COALESCE(@workflow_transaction,0)=0 THEN COMMIT; END IF;
END$$


CREATE PROCEDURE sp_approve_loan(IN p_loan_id CHAR(36), IN p_officer_id CHAR(36))
BEGIN
 DECLARE v_role VARCHAR(20); DECLARE v_status VARCHAR(20);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 IF COALESCE(@workflow_transaction,0)=0 THEN START TRANSACTION; END IF;
 SELECT role INTO v_role FROM users WHERE user_id=p_officer_id AND is_active=TRUE;
 IF v_role IS NULL OR v_role NOT IN ('loan_officer','risk_admin') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only active officers can approve loans'; END IF;
 SELECT status INTO v_status FROM loans WHERE loan_id=p_loan_id FOR UPDATE;
 IF v_status IS NULL OR v_status NOT IN ('pending','under_review') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Loan is not in a reviewable state'; END IF;
 UPDATE loans SET status='approved',officer_id=p_officer_id,approved_at=CURRENT_TIMESTAMP WHERE loan_id=p_loan_id;
 IF COALESCE(@workflow_transaction,0)=0 THEN COMMIT; END IF;
END$$
CREATE PROCEDURE sp_disburse_loan(IN p_loan_id CHAR(36), IN p_officer_id CHAR(36), IN p_bank_account_id CHAR(36))
BEGIN
 DECLARE v_role VARCHAR(20); DECLARE v_status VARCHAR(20); DECLARE v_borrower CHAR(36);
 DECLARE v_payout CHAR(36); DECLARE v_principal DECIMAL(15,2); DECLARE v_paid TIMESTAMP;
 DECLARE v_transaction CHAR(36); DECLARE v_bank_balance DECIMAL(15,2); DECLARE v_minimum DECIMAL(15,2);
 DECLARE v_bank_status VARCHAR(20); DECLARE v_target_status VARCHAR(20); DECLARE v_bank_type VARCHAR(30);
 DECLARE v_target_owner CHAR(36); DECLARE v_bank_currency CHAR(3); DECLARE v_target_currency CHAR(3); DECLARE v_lock DECIMAL(15,2);
 DECLARE v_settled INT; DECLARE v_assessment JSON;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 IF COALESCE(@workflow_transaction,0)=0 THEN START TRANSACTION; END IF;
 SELECT role INTO v_role FROM users WHERE user_id=p_officer_id AND is_active=TRUE;
 IF v_role IS NULL OR v_role NOT IN ('loan_officer','risk_admin') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only active officers can disburse loans'; END IF;
 SELECT status,borrower_id,payout_account_id,principal_amount,disbursed_at,assessment_snapshot INTO v_status,v_borrower,v_payout,v_principal,v_paid,v_assessment FROM loans WHERE loan_id=p_loan_id FOR UPDATE;
 IF v_status IS NULL OR v_status NOT IN ('approved','active') OR v_paid IS NOT NULL OR v_assessment IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Loan must be approved, assessed and not already disbursed'; END IF;
 SELECT COUNT(*) INTO v_settled FROM loan_repayments WHERE loan_id=p_loan_id AND is_settled=TRUE;
 IF v_settled>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Legacy loan has repayments; manual reconciliation is required'; END IF;
 IF v_payout IS NULL OR p_bank_account_id IS NULL OR v_payout=p_bank_account_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A distinct payout account is required'; END IF;
 IF v_payout<p_bank_account_id THEN
 SELECT balance INTO v_lock FROM accounts WHERE account_id=v_payout FOR UPDATE;
 SELECT balance INTO v_lock FROM accounts WHERE account_id=p_bank_account_id FOR UPDATE;
 ELSE
 SELECT balance INTO v_lock FROM accounts WHERE account_id=p_bank_account_id FOR UPDATE;
 SELECT balance INTO v_lock FROM accounts WHERE account_id=v_payout FOR UPDATE;
 END IF;
 SELECT balance,minimum_balance,status,type,currency INTO v_bank_balance,v_minimum,v_bank_status,v_bank_type,v_bank_currency FROM accounts WHERE account_id=p_bank_account_id;
 SELECT user_id,status,currency INTO v_target_owner,v_target_status,v_target_currency FROM accounts WHERE account_id=v_payout;
 IF v_bank_status IS NULL OR v_target_status IS NULL OR v_bank_status<>'active' OR v_target_status<>'active' OR v_bank_type<>'loan_disbursement' OR v_target_owner<>v_borrower OR v_bank_currency<>v_target_currency THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid disbursement accounts or currency'; END IF;
 IF v_bank_balance-v_principal<v_minimum THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient disbursement funds'; END IF;
 UPDATE accounts SET balance=balance-v_principal WHERE account_id=p_bank_account_id;
 UPDATE accounts SET balance=balance+v_principal WHERE account_id=v_payout;
 SET v_transaction=UUID();
 INSERT INTO transactions(transaction_id,reference_number,source_account_id,destination_account_id,type,amount,description) VALUES(v_transaction,CONCAT('LOAN-',REPLACE(v_transaction,'-','')),p_bank_account_id,v_payout,'loan_disbursement',v_principal,CONCAT('Disbursement ',p_loan_id));
 UPDATE loans SET status='approved',disbursed_at=CURRENT_TIMESTAMP,disbursement_transaction_id=v_transaction WHERE loan_id=p_loan_id;
 CALL sp_generate_amortization_schedule(p_loan_id);
 IF COALESCE(@workflow_transaction,0)=0 THEN COMMIT; END IF;
 SELECT v_transaction AS transaction_id;
END$$
CREATE PROCEDURE sp_pay_loan_installment(
    IN p_repayment_id CHAR(36),
    IN p_source_account_id CHAR(36),
    IN p_bank_repayment_account_id CHAR(36)
)
BEGIN
    DECLARE v_loan_status VARCHAR(20);
    DECLARE v_disbursed TIMESTAMP;
    DECLARE v_borrower CHAR(36);
    DECLARE v_owner CHAR(36);
    DECLARE v_source_currency CHAR(3);
    DECLARE v_bank_currency CHAR(3);
    DECLARE v_bank_type VARCHAR(30);
    DECLARE v_total_due DECIMAL(15,2);
    DECLARE v_is_settled BOOLEAN;
    DECLARE v_loan_id CHAR(36);
    DECLARE v_source_balance DECIMAL(15,2);
    DECLARE v_source_minimum DECIMAL(15,2);
    DECLARE v_source_status VARCHAR(20);
    DECLARE v_destination_status VARCHAR(20);
    DECLARE v_lock_balance DECIMAL(15,2);
    DECLARE v_transaction_id CHAR(36);
    DECLARE v_reference VARCHAR(64);
    DECLARE v_remaining_installments INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF COALESCE(@workflow_transaction,0)=0 THEN START TRANSACTION; END IF;
    SELECT loan_id INTO v_loan_id FROM loan_repayments WHERE repayment_id=p_repayment_id;
    SELECT status,disbursed_at,borrower_id INTO v_loan_status,v_disbursed,v_borrower FROM loans WHERE loan_id=v_loan_id FOR UPDATE;
    IF v_loan_status IS NULL OR v_loan_status<>'active' OR v_disbursed IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Loan must be active and disbursed before repayment'; END IF;

    SELECT total_due, is_settled, loan_id
      INTO v_total_due, v_is_settled, v_loan_id
      FROM loan_repayments
     WHERE repayment_id = p_repayment_id
     FOR UPDATE;

    IF v_total_due IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Repayment installment not found';
    END IF;

    IF v_is_settled = TRUE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Installment is already settled';
    END IF;

    IF p_source_account_id = p_bank_repayment_account_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Source and repayment accounts must be different';
    END IF;

    -- Lock both accounts in deterministic order. The money movement and EMI settlement
    -- now live in the SAME transaction so a partial repayment cannot be committed.
    IF p_source_account_id < p_bank_repayment_account_id THEN
        SELECT balance INTO v_lock_balance FROM accounts WHERE account_id = p_source_account_id FOR UPDATE;
        SELECT balance INTO v_lock_balance FROM accounts WHERE account_id = p_bank_repayment_account_id FOR UPDATE;
    ELSE
        SELECT balance INTO v_lock_balance FROM accounts WHERE account_id = p_bank_repayment_account_id FOR UPDATE;
        SELECT balance INTO v_lock_balance FROM accounts WHERE account_id = p_source_account_id FOR UPDATE;
    END IF;

    SELECT balance, minimum_balance, status
      INTO v_source_balance, v_source_minimum, v_source_status
      FROM accounts
     WHERE account_id = p_source_account_id;

    SELECT status
      INTO v_destination_status
      FROM accounts
     WHERE account_id = p_bank_repayment_account_id;

    SELECT user_id,currency INTO v_owner,v_source_currency FROM accounts WHERE account_id=p_source_account_id;
    SELECT currency,type INTO v_bank_currency,v_bank_type FROM accounts WHERE account_id=p_bank_repayment_account_id;
    IF v_owner IS NULL OR v_owner<>v_borrower OR v_source_currency<>v_bank_currency OR v_bank_type<>'escrow' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid repayment ownership, bank account or currency'; END IF;
    IF v_source_status IS NULL OR v_destination_status IS NULL OR v_source_status <> 'active' OR v_destination_status <> 'active' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Both repayment accounts must be active';
    END IF;

    IF v_source_balance - v_total_due < v_source_minimum THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient available balance for installment';
    END IF;

    UPDATE accounts SET balance = balance - v_total_due WHERE account_id = p_source_account_id;
    UPDATE accounts SET balance = balance + v_total_due WHERE account_id = p_bank_repayment_account_id;

    SET v_transaction_id = UUID();
    SET v_reference = CONCAT('EMI-', REPLACE(UPPER(v_transaction_id), '-', ''));

    INSERT INTO transactions(
        transaction_id, reference_number, source_account_id,
        destination_account_id, type, amount, description, status
    ) VALUES (
        v_transaction_id, v_reference, p_source_account_id,
        p_bank_repayment_account_id, 'repayment', v_total_due,
        CONCAT('Loan installment payment: ', p_repayment_id), 'completed'
    );

    UPDATE loan_repayments
       SET amount_paid = total_due,
           is_settled = TRUE,
           paid_at = CURRENT_TIMESTAMP,
           transaction_id = v_transaction_id
     WHERE repayment_id = p_repayment_id;

    SELECT COUNT(*) INTO v_remaining_installments
      FROM loan_repayments
     WHERE loan_id = v_loan_id AND is_settled = FALSE;

    IF v_remaining_installments = 0 THEN
        UPDATE loans SET status = 'closed' WHERE loan_id = v_loan_id;
    END IF;

    IF COALESCE(@workflow_transaction,0)=0 THEN COMMIT; END IF;

    SELECT v_transaction_id AS transaction_id, v_total_due AS amount_paid,
           v_remaining_installments AS remaining_installments;
END$$

DELIMITER ;
