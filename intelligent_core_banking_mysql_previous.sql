-- Intelligent Core Banking & Commercial Credit Risk Engine

DROP DATABASE IF EXISTS intelligent_core_banking;
CREATE DATABASE intelligent_core_banking CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE intelligent_core_banking;

-- =========================
-- TABLES
-- =========================

CREATE TABLE users (
    user_id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('customer','loan_officer','risk_admin') NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE branches (
    branch_id INT PRIMARY KEY AUTO_INCREMENT,
    branch_code VARCHAR(20) NOT NULL UNIQUE,
    branch_name VARCHAR(120) NOT NULL,
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE accounts (
    account_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    branch_id INT NOT NULL,
    account_number VARCHAR(34) NOT NULL UNIQUE,
    type ENUM('checking','savings','escrow','loan_disbursement') NOT NULL,
    status ENUM('active','frozen','closed') NOT NULL DEFAULT 'active',
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    minimum_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_accounts_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE RESTRICT,
    CONSTRAINT chk_account_balance CHECK (balance >= minimum_balance),
    CONSTRAINT chk_minimum_balance CHECK (minimum_balance >= 0.00)
) ENGINE=InnoDB;

CREATE TABLE beneficiaries (
    beneficiary_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    beneficiary_account_id CHAR(36) NOT NULL,
    nickname VARCHAR(100),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_beneficiary_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_beneficiary_account FOREIGN KEY (beneficiary_account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
    CONSTRAINT uq_user_beneficiary UNIQUE (user_id, beneficiary_account_id)
) ENGINE=InnoDB;

CREATE TABLE security_logs (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36),
    event_type ENUM('login_success','login_failure','logout','password_change','account_freeze','role_change') NOT NULL,
    ip_address VARCHAR(45),
    details VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_security_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE transactions (
    transaction_id CHAR(36) PRIMARY KEY,
    reference_number VARCHAR(64) NOT NULL UNIQUE,
    source_account_id CHAR(36),
    destination_account_id CHAR(36),
    type ENUM('deposit','withdrawal','transfer','loan_disbursement','repayment') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(500),
    status ENUM('completed','failed','reversed') NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tx_source FOREIGN KEY (source_account_id) REFERENCES accounts(account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_destination FOREIGN KEY (destination_account_id) REFERENCES accounts(account_id) ON DELETE RESTRICT,
    CONSTRAINT chk_tx_amount CHECK (amount > 0.00),
    CONSTRAINT chk_tx_accounts CHECK (
        (type='deposit' AND source_account_id IS NULL AND destination_account_id IS NOT NULL) OR
        (type='withdrawal' AND source_account_id IS NOT NULL AND destination_account_id IS NULL) OR
        (type IN ('transfer','loan_disbursement','repayment') AND source_account_id IS NOT NULL AND destination_account_id IS NOT NULL AND source_account_id <> destination_account_id)
    )
) ENGINE=InnoDB;

CREATE TABLE loans (
    loan_id CHAR(36) PRIMARY KEY,
    borrower_id CHAR(36) NOT NULL,
    officer_id CHAR(36),
    mongodb_credit_profile_id VARCHAR(24) NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    annual_interest_rate DECIMAL(7,6) NOT NULL,
    term_months INT NOT NULL,
    purpose VARCHAR(255),
    status ENUM('pending','under_review','approved','rejected','active','closed','defaulted') NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_loan_borrower FOREIGN KEY (borrower_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_loan_officer FOREIGN KEY (officer_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_loan_principal CHECK (principal_amount > 0.00),
    CONSTRAINT chk_interest_rate CHECK (annual_interest_rate >= 0.000000 AND annual_interest_rate <= 1.000000),
    CONSTRAINT chk_term CHECK (term_months > 0)
) ENGINE=InnoDB;

CREATE TABLE collateral (
    collateral_id CHAR(36) PRIMARY KEY,
    loan_id CHAR(36) NOT NULL,
    collateral_type ENUM('property','vehicle','equipment','deposit','inventory','other') NOT NULL,
    description VARCHAR(500) NOT NULL,
    estimated_value DECIMAL(15,2) NOT NULL,
    valuation_date DATE NOT NULL,
    status ENUM('proposed','verified','released') NOT NULL DEFAULT 'proposed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_collateral_loan FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
    CONSTRAINT chk_collateral_value CHECK (estimated_value > 0.00)
) ENGINE=InnoDB;

CREATE TABLE loan_repayments (
    repayment_id CHAR(36) PRIMARY KEY,
    loan_id CHAR(36) NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    principal_due DECIMAL(15,2) NOT NULL,
    interest_due DECIMAL(15,2) NOT NULL,
    total_due DECIMAL(15,2) NOT NULL,
    amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMP NULL,
    transaction_id CHAR(36) NULL,
    CONSTRAINT fk_repayment_loan FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
    CONSTRAINT fk_repayment_tx FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    CONSTRAINT uq_loan_installment UNIQUE (loan_id, installment_number),
    CONSTRAINT chk_installment_number CHECK (installment_number > 0),
    CONSTRAINT chk_repayment_amounts CHECK (principal_due >= 0 AND interest_due >= 0 AND total_due = principal_due + interest_due),
    CONSTRAINT chk_amount_paid CHECK (amount_paid >= 0 AND amount_paid <= total_due)
) ENGINE=InnoDB;

CREATE TABLE account_audit_log (
    audit_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id CHAR(36) NOT NULL,
    old_balance DECIMAL(15,2) NOT NULL,
    new_balance DECIMAL(15,2) NOT NULL,
    delta_amount DECIMAL(15,2) NOT NULL,
    operation_type VARCHAR(32) NOT NULL,
    changed_by_app_user VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_account FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- INDEXES
-- =========================

CREATE INDEX idx_users_role_email ON users(role, email);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_transactions_source_dest ON transactions(source_account_id, destination_account_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_loans_borrower_status ON loans(borrower_id, status);
CREATE INDEX idx_loans_officer_status ON loans(officer_id, status);
CREATE INDEX idx_repayments_schedule ON loan_repayments(loan_id, due_date, is_settled);
CREATE INDEX idx_audit_account_time ON account_audit_log(account_id, changed_at);
CREATE INDEX idx_security_user_time ON security_logs(user_id, created_at);

-- =========================
-- TRIGGERS
-- =========================

DELIMITER $$

CREATE TRIGGER trg_validate_account_minimum_balance
BEFORE UPDATE ON accounts
FOR EACH ROW
BEGIN
    IF NEW.balance < NEW.minimum_balance THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transaction rejected: account balance would fall below minimum balance';
    END IF;
END$$

CREATE TRIGGER trg_account_balance_audit
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
    IF OLD.balance <> NEW.balance THEN
        INSERT INTO account_audit_log(
            account_id, old_balance, new_balance, delta_amount,
            operation_type, changed_by_app_user
        ) VALUES (
            NEW.account_id, OLD.balance, NEW.balance,
            NEW.balance - OLD.balance, 'UPDATE', CURRENT_USER()
        );
    END IF;
END$$

-- =========================
-- STORED PROCEDURES
-- =========================

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

    START TRANSACTION;

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

    COMMIT;
END$$

CREATE PROCEDURE sp_generate_amortization_schedule(IN p_loan_id CHAR(36))
BEGIN
    DECLARE v_principal DECIMAL(15,2);
    DECLARE v_annual_rate DECIMAL(7,6);
    DECLARE v_term INT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_monthly_rate DECIMAL(18,10);
    DECLARE v_monthly_payment DECIMAL(15,2);
    DECLARE v_remaining DECIMAL(15,2);
    DECLARE v_interest DECIMAL(15,2);
    DECLARE v_principal_due DECIMAL(15,2);
    DECLARE v_total_due DECIMAL(15,2);
    DECLARE v_i INT DEFAULT 1;
    DECLARE v_due_date DATE;

    SELECT principal_amount, annual_interest_rate, term_months, status
      INTO v_principal, v_annual_rate, v_term, v_status
      FROM loans
     WHERE loan_id = p_loan_id
     FOR UPDATE;

    IF v_status <> 'approved' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan must be approved before amortization schedule generation';
    END IF;

    DELETE FROM loan_repayments
     WHERE loan_id = p_loan_id AND is_settled = FALSE;

    SET v_remaining = v_principal;
    SET v_monthly_rate = v_annual_rate / 12.0;

    IF v_monthly_rate = 0 THEN
        SET v_monthly_payment = ROUND(v_principal / v_term, 2);
    ELSE
        SET v_monthly_payment = ROUND(
            v_principal * (v_monthly_rate * POWER(1 + v_monthly_rate, v_term)) /
            (POWER(1 + v_monthly_rate, v_term) - 1), 2
        );
    END IF;

    WHILE v_i <= v_term DO
        SET v_due_date = DATE_ADD(CURDATE(), INTERVAL v_i MONTH);
        SET v_interest = ROUND(v_remaining * v_monthly_rate, 2);

        IF v_i = v_term THEN
            SET v_principal_due = v_remaining;
            SET v_total_due = v_principal_due + v_interest;
        ELSE
            SET v_principal_due = ROUND(v_monthly_payment - v_interest, 2);
            SET v_total_due = v_monthly_payment;
        END IF;

        INSERT INTO loan_repayments(
            repayment_id, loan_id, installment_number, due_date,
            principal_due, interest_due, total_due, amount_paid, is_settled
        ) VALUES (
            UUID(), p_loan_id, v_i, v_due_date,
            v_principal_due, v_interest, v_total_due, 0.00, FALSE
        );

        SET v_remaining = ROUND(v_remaining - v_principal_due, 2);
        SET v_i = v_i + 1;
    END WHILE;

    UPDATE loans SET status = 'active' WHERE loan_id = p_loan_id;
END$$

CREATE PROCEDURE sp_approve_loan(
    IN p_loan_id CHAR(36),
    IN p_officer_id CHAR(36)
)
BEGIN
    DECLARE v_role VARCHAR(20);
    DECLARE v_loan_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT role INTO v_role
      FROM users
     WHERE user_id = p_officer_id AND is_active = TRUE
     FOR UPDATE;

    IF v_role NOT IN ('loan_officer','risk_admin') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only loan officers or risk admins can approve loans';
    END IF;

    SELECT status INTO v_loan_status
      FROM loans
     WHERE loan_id = p_loan_id
     FOR UPDATE;

    IF v_loan_status NOT IN ('pending','under_review') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan is not in an approvable state';
    END IF;

    UPDATE loans
       SET status = 'approved', officer_id = p_officer_id, approved_at = CURRENT_TIMESTAMP
     WHERE loan_id = p_loan_id;

    CALL sp_generate_amortization_schedule(p_loan_id);

    COMMIT;
END$$

CREATE PROCEDURE sp_pay_loan_installment(
    IN p_repayment_id CHAR(36),
    IN p_source_account_id CHAR(36),
    IN p_bank_repayment_account_id CHAR(36)
)
BEGIN
    DECLARE v_total_due DECIMAL(15,2);
    DECLARE v_is_settled BOOLEAN;
    DECLARE v_transaction_id CHAR(36);

    SELECT total_due, is_settled
      INTO v_total_due, v_is_settled
      FROM loan_repayments
     WHERE repayment_id = p_repayment_id;

    IF v_is_settled = TRUE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Installment is already settled';
    END IF;

    CALL sp_transfer_funds(
        p_source_account_id,
        p_bank_repayment_account_id,
        v_total_due,
        CONCAT('Loan installment payment: ', p_repayment_id),
        v_transaction_id
    );

    UPDATE transactions SET type = 'repayment' WHERE transaction_id = v_transaction_id;

    UPDATE loan_repayments
       SET amount_paid = total_due,
           is_settled = TRUE,
           paid_at = CURRENT_TIMESTAMP,
           transaction_id = v_transaction_id
     WHERE repayment_id = p_repayment_id;

    SELECT v_transaction_id AS transaction_id, v_total_due AS amount_paid;
END$$

DELIMITER ;

-- =========================
-- VIEWS
-- =========================

CREATE OR REPLACE VIEW vw_executive_portfolio_summary AS
SELECT
    (SELECT COUNT(*) FROM users WHERE role='customer' AND is_active=TRUE) AS active_customers,
    (SELECT COUNT(*) FROM accounts WHERE status='active') AS active_accounts,
    (SELECT COALESCE(SUM(balance),0) FROM accounts WHERE status='active' AND type IN ('checking','savings')) AS customer_deposits,
    (SELECT COUNT(*) FROM loans WHERE status IN ('approved','active')) AS approved_or_active_loans,
    (SELECT COALESCE(SUM(principal_amount),0) FROM loans WHERE status IN ('approved','active')) AS loan_exposure,
    (SELECT COUNT(*) FROM loans WHERE status='defaulted') AS defaulted_loans,
    (SELECT COUNT(*) FROM transactions WHERE status='completed') AS completed_transactions;

CREATE OR REPLACE VIEW vw_officer_loan_performance AS
SELECT
    u.user_id AS officer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS officer_name,
    COUNT(l.loan_id) AS loans_processed,
    SUM(CASE WHEN l.status IN ('approved','active','closed') THEN 1 ELSE 0 END) AS approved_loans,
    SUM(CASE WHEN l.status='rejected' THEN 1 ELSE 0 END) AS rejected_loans,
    COALESCE(SUM(CASE WHEN l.status IN ('approved','active','closed') THEN l.principal_amount ELSE 0 END),0) AS approved_capital,
    ROUND(AVG(CASE WHEN l.status IN ('approved','active','closed') THEN l.annual_interest_rate * 100 END),2) AS avg_interest_rate_percent
FROM users u
LEFT JOIN loans l ON l.officer_id = u.user_id
WHERE u.role='loan_officer'
GROUP BY u.user_id, u.first_name, u.last_name;

CREATE OR REPLACE VIEW vw_customer_account_summary AS
SELECT
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
    a.account_id,
    a.account_number,
    a.type,
    a.status,
    a.currency,
    a.balance,
    b.branch_name
FROM users u
JOIN accounts a ON a.user_id = u.user_id
JOIN branches b ON b.branch_id = a.branch_id
WHERE u.role='customer';

-- =========================
-- SAMPLE DATA
-- =========================

INSERT INTO branches(branch_code, branch_name, city, state, ifsc_code) VALUES
('BLR001','Bengaluru Central Branch','Bengaluru','Karnataka','ICBR0000001'),
('DEL001','Delhi Corporate Branch','New Delhi','Delhi','ICBR0000002');

INSERT INTO users(user_id,email,password_hash,first_name,last_name,role) VALUES
('11111111-1111-4111-8111-111111111111','arjun@example.com','$2b$demo_hash_1','Arjun','Mehta','customer'),
('22222222-2222-4222-8222-222222222222','neha@example.com','$2b$demo_hash_2','Neha','Rao','customer'),
('33333333-3333-4333-8333-333333333333','officer@example.com','$2b$demo_hash_3','Riya','Sharma','loan_officer'),
('44444444-4444-4444-8444-444444444444','admin@example.com','$2b$demo_hash_4','Aman','Kapoor','risk_admin');

INSERT INTO accounts(account_id,user_id,branch_id,account_number,type,status,currency,balance,minimum_balance) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','11111111-1111-4111-8111-111111111111',1,'100100000001','savings','active','INR',125000.00,5000.00),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','22222222-2222-4222-8222-222222222222',1,'100100000002','checking','active','INR',85000.00,2000.00),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','44444444-4444-4444-8444-444444444444',2,'900000000001','escrow','active','INR',5000000.00,0.00),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','44444444-4444-4444-8444-444444444444',2,'900000000002','loan_disbursement','active','INR',10000000.00,0.00);

INSERT INTO beneficiaries(beneficiary_id,user_id,beneficiary_account_id,nickname,is_verified) VALUES
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Neha',TRUE);

INSERT INTO security_logs(user_id,event_type,ip_address,details) VALUES
('11111111-1111-4111-8111-111111111111','login_success','127.0.0.1','Demo customer login'),
('33333333-3333-4333-8333-333333333333','login_success','127.0.0.1','Demo loan officer login');

INSERT INTO loans(
    loan_id, borrower_id, officer_id, mongodb_credit_profile_id,
    principal_amount, annual_interest_rate, term_months, purpose, status
) VALUES
('cccccccc-cccc-4ccc-8ccc-ccccccccccc1','11111111-1111-4111-8111-111111111111',NULL,'66ff00000000000000000001',600000.00,0.105000,24,'Business working capital','pending'),
('cccccccc-cccc-4ccc-8ccc-ccccccccccc2','22222222-2222-4222-8222-222222222222',NULL,'66ff00000000000000000002',350000.00,0.092500,18,'Equipment purchase','under_review');

INSERT INTO collateral(collateral_id,loan_id,collateral_type,description,estimated_value,valuation_date,status) VALUES
('dddddddd-dddd-4ddd-8ddd-ddddddddddd1','cccccccc-cccc-4ccc-8ccc-ccccccccccc1','equipment','Commercial machinery and inventory',900000.00,CURDATE(),'verified'),
('dddddddd-dddd-4ddd-8ddd-ddddddddddd2','cccccccc-cccc-4ccc-8ccc-ccccccccccc2','deposit','Fixed-deposit lien',500000.00,CURDATE(),'verified');

-- Approve one loan and automatically create its EMI schedule.
CALL sp_approve_loan('cccccccc-cccc-4ccc-8ccc-ccccccccccc1','33333333-3333-4333-8333-333333333333');

-- Example transfer used for demo data.
CALL sp_transfer_funds(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    10000.00,
    'Demo intra-bank transfer',
    @demo_transaction_id
);

