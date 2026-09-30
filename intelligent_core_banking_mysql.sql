DROP DATABASE IF EXISTS intelligent_banking;
CREATE DATABASE intelligent_banking CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE intelligent_banking;

CREATE TABLE users (
    user_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('customer','loan_officer','risk_admin') NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE branches (
    branch_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    location VARCHAR(150) NOT NULL,
    routing_code VARCHAR(30) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE accounts (
    account_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    branch_id CHAR(36) NOT NULL,
    account_number VARCHAR(34) UNIQUE NOT NULL,
    type ENUM('checking','savings','escrow','loan_disbursement') NOT NULL,
    status ENUM('active','frozen','closed') NOT NULL DEFAULT 'active',
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    minimum_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_accounts_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE RESTRICT,
    CONSTRAINT chk_account_balance CHECK (balance >= minimum_balance),
    CONSTRAINT chk_minimum_balance CHECK (minimum_balance >= 0.00)
) ENGINE=InnoDB;

CREATE TABLE beneficiaries (
    beneficiary_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    payee_name VARCHAR(150) NOT NULL,
    routing_number VARCHAR(30),
    account_number VARCHAR(34) NOT NULL,
    CONSTRAINT fk_beneficiaries_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uq_beneficiary UNIQUE (user_id, routing_number, account_number)
) ENGINE=InnoDB;

CREATE TABLE security_logs (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36) NOT NULL,
    ip_address VARCHAR(45),
    device_fingerprint VARCHAR(255),
    login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    auth_status ENUM('success','failed','locked') NOT NULL,
    CONSTRAINT fk_security_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE transactions (
    transaction_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    reference_number VARCHAR(64) UNIQUE NOT NULL,
    source_account_id CHAR(36),
    destination_account_id CHAR(36),
    type ENUM('deposit','withdrawal','transfer','loan_disbursement','repayment') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    status ENUM('pending','completed','failed','reversed') NOT NULL DEFAULT 'completed',
    fee_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_source FOREIGN KEY (source_account_id) REFERENCES accounts(account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_destination FOREIGN KEY (destination_account_id) REFERENCES accounts(account_id) ON DELETE RESTRICT,
    CONSTRAINT chk_transaction_amount CHECK (amount > 0.00),
    CONSTRAINT chk_transaction_fee CHECK (fee_amount >= 0.00),
    CONSTRAINT chk_transaction_accounts CHECK (
        (type = 'deposit' AND source_account_id IS NULL AND destination_account_id IS NOT NULL) OR
        (type = 'withdrawal' AND source_account_id IS NOT NULL AND destination_account_id IS NULL) OR
        (type IN ('transfer','loan_disbursement','repayment') AND source_account_id IS NOT NULL AND destination_account_id IS NOT NULL AND source_account_id <> destination_account_id)
    )
) ENGINE=InnoDB;

CREATE TABLE loans (
    loan_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    borrower_id CHAR(36) NOT NULL,
    officer_id CHAR(36),
    mongodb_credit_profile_id VARCHAR(24) NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    annual_interest_rate DECIMAL(5,4) NOT NULL,
    term_months INT NOT NULL,
    status ENUM('pending','under_review','approved','rejected','active','closed','defaulted') NOT NULL DEFAULT 'pending',
    approval_date DATE,
    officer_comments TEXT,
    override_flag BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_loans_borrower FOREIGN KEY (borrower_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_loans_officer FOREIGN KEY (officer_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_loan_principal CHECK (principal_amount > 0.00),
    CONSTRAINT chk_interest_rate CHECK (annual_interest_rate >= 0.0000 AND annual_interest_rate <= 1.0000),
    CONSTRAINT chk_loan_term CHECK (term_months > 0)
) ENGINE=InnoDB;

CREATE TABLE collateral (
    asset_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    loan_id CHAR(36) NOT NULL,
    type VARCHAR(80) NOT NULL,
    estimated_value DECIMAL(15,2) NOT NULL,
    valuation_date DATE NOT NULL,
    CONSTRAINT fk_collateral_loan FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
    CONSTRAINT chk_collateral_value CHECK (estimated_value > 0.00)
) ENGINE=InnoDB;

CREATE TABLE loan_repayments (
    repayment_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    loan_id CHAR(36) NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    principal_due DECIMAL(15,2) NOT NULL,
    interest_due DECIMAL(15,2) NOT NULL,
    total_due DECIMAL(15,2) NOT NULL,
    amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at DATETIME,
    CONSTRAINT fk_repayments_loan FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
    CONSTRAINT chk_installment_number CHECK (installment_number > 0),
    CONSTRAINT chk_repayment_amounts CHECK (principal_due >= 0.00 AND interest_due >= 0.00 AND total_due = principal_due + interest_due AND amount_paid >= 0.00),
    CONSTRAINT uq_loan_installment UNIQUE (loan_id, installment_number)
) ENGINE=InnoDB;

CREATE TABLE account_audit_log (
    audit_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id CHAR(36) NOT NULL,
    old_balance DECIMAL(15,2) NOT NULL,
    new_balance DECIMAL(15,2) NOT NULL,
    delta_amount DECIMAL(15,2) NOT NULL,
    operation_type VARCHAR(32) NOT NULL,
    changed_by_app_user VARCHAR(255) DEFAULT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_account FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_users_role_email ON users(role, email);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_branch_id ON accounts(branch_id);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_transactions_source_dest ON transactions(source_account_id, destination_account_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_loans_borrower_status ON loans(borrower_id, status);
CREATE INDEX idx_loan_repayments_schedule ON loan_repayments(loan_id, due_date, is_settled);
CREATE INDEX idx_audit_account_timestamp ON account_audit_log(account_id, changed_at);

DELIMITER $$

CREATE TRIGGER trg_validate_account_minimum_balance
BEFORE UPDATE ON accounts
FOR EACH ROW
BEGIN
    IF NEW.balance < NEW.minimum_balance THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction rejected: balance would fall below minimum balance';
    END IF;
END$$

CREATE TRIGGER trg_account_balance_audit
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
    IF NOT (OLD.balance <=> NEW.balance) THEN
        INSERT INTO account_audit_log (
            account_id, old_balance, new_balance, delta_amount, operation_type, changed_by_app_user
        ) VALUES (
            NEW.account_id, OLD.balance, NEW.balance, NEW.balance - OLD.balance, 'UPDATE', CURRENT_USER()
        );
    END IF;
END$$

CREATE PROCEDURE sp_transfer_funds(
    IN p_source_account_id CHAR(36),
    IN p_destination_account_id CHAR(36),
    IN p_amount DECIMAL(15,2),
    IN p_description TEXT,
    OUT p_transaction_id CHAR(36)
)
BEGIN
    DECLARE v_source_balance DECIMAL(15,2);
    DECLARE v_source_minimum DECIMAL(15,2);
    DECLARE v_source_status VARCHAR(20);
    DECLARE v_destination_status VARCHAR(20);
    DECLARE v_first_lock CHAR(36);
    DECLARE v_second_lock CHAR(36);
    DECLARE v_locked_id CHAR(36);
    DECLARE v_account_count INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer amount must be positive';
    END IF;

    IF p_source_account_id = p_destination_account_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Source and destination accounts must be different';
    END IF;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_account_count
    FROM accounts
    WHERE account_id IN (p_source_account_id, p_destination_account_id);

    IF v_account_count <> 2 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Source or destination account not found';
    END IF;

    IF p_source_account_id < p_destination_account_id THEN
        SET v_first_lock = p_source_account_id;
        SET v_second_lock = p_destination_account_id;
    ELSE
        SET v_first_lock = p_destination_account_id;
        SET v_second_lock = p_source_account_id;
    END IF;

    SELECT account_id INTO v_locked_id
    FROM accounts
    WHERE account_id = v_first_lock
    FOR UPDATE;

    SELECT account_id INTO v_locked_id
    FROM accounts
    WHERE account_id = v_second_lock
    FOR UPDATE;

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
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient available balance';
    END IF;

    UPDATE accounts
    SET balance = balance - p_amount
    WHERE account_id = p_source_account_id;

    UPDATE accounts
    SET balance = balance + p_amount
    WHERE account_id = p_destination_account_id;

    SET p_transaction_id = UUID();

    INSERT INTO transactions (
        transaction_id, reference_number, source_account_id, destination_account_id,
        type, amount, description, status
    ) VALUES (
        p_transaction_id,
        CONCAT('TXN-', UPPER(SUBSTRING(REPLACE(p_transaction_id, '-', ''), 1, 8))),
        p_source_account_id,
        p_destination_account_id,
        'transfer',
        p_amount,
        p_description,
        'completed'
    );

    COMMIT;
END$$

CREATE PROCEDURE sp_generate_amortization_schedule(IN p_loan_id CHAR(36))
BEGIN
    DECLARE v_principal DECIMAL(15,2);
    DECLARE v_annual_rate DECIMAL(5,4);
    DECLARE v_term_months INT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_monthly_rate DECIMAL(15,10);
    DECLARE v_monthly_payment DECIMAL(15,2);
    DECLARE v_remaining_balance DECIMAL(15,2);
    DECLARE v_interest_due DECIMAL(15,2);
    DECLARE v_principal_due DECIMAL(15,2);
    DECLARE v_due_date DATE;
    DECLARE v_i INT DEFAULT 1;
    DECLARE v_loan_count INT;

    SELECT COUNT(*) INTO v_loan_count
    FROM loans
    WHERE loan_id = p_loan_id;

    IF v_loan_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan not found';
    END IF;

    SELECT principal_amount, annual_interest_rate, term_months, status
    INTO v_principal, v_annual_rate, v_term_months, v_status
    FROM loans
    WHERE loan_id = p_loan_id
    FOR UPDATE;

    IF v_status <> 'approved' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan must be approved before schedule generation';
    END IF;

    DELETE FROM loan_repayments
    WHERE loan_id = p_loan_id AND is_settled = FALSE;

    SET v_remaining_balance = v_principal;
    SET v_due_date = CURDATE();

    IF v_annual_rate = 0 THEN
        SET v_monthly_rate = 0;
        SET v_monthly_payment = ROUND(v_principal / v_term_months, 2);
    ELSE
        SET v_monthly_rate = v_annual_rate / 12.0;
        SET v_monthly_payment = ROUND(
            v_principal * (v_monthly_rate * POWER(1 + v_monthly_rate, v_term_months)) /
            (POWER(1 + v_monthly_rate, v_term_months) - 1),
            2
        );
    END IF;

    WHILE v_i <= v_term_months DO
        SET v_due_date = DATE_ADD(v_due_date, INTERVAL 1 MONTH);

        IF v_i = v_term_months THEN
            SET v_principal_due = ROUND(v_remaining_balance, 2);
            SET v_interest_due = ROUND(v_remaining_balance * v_monthly_rate, 2);
            SET v_monthly_payment = v_principal_due + v_interest_due;
        ELSE
            SET v_interest_due = ROUND(v_remaining_balance * v_monthly_rate, 2);
            SET v_principal_due = v_monthly_payment - v_interest_due;
        END IF;

        INSERT INTO loan_repayments (
            loan_id, installment_number, due_date,
            principal_due, interest_due, total_due
        ) VALUES (
            p_loan_id, v_i, v_due_date,
            v_principal_due, v_interest_due, v_monthly_payment
        );

        SET v_remaining_balance = v_remaining_balance - v_principal_due;
        SET v_i = v_i + 1;
    END WHILE;

    UPDATE loans
    SET status = 'active'
    WHERE loan_id = p_loan_id;
END$$

CREATE PROCEDURE sp_approve_loan(
    IN p_loan_id CHAR(36),
    IN p_officer_id CHAR(36),
    IN p_comments TEXT,
    IN p_override BOOLEAN
)
BEGIN
    DECLARE v_officer_count INT;
    DECLARE v_rows INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_officer_count
    FROM users
    WHERE user_id = p_officer_id
      AND role = 'loan_officer'
      AND is_active = TRUE;

    IF v_officer_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid active loan officer required';
    END IF;

    UPDATE loans
    SET status = 'approved',
        officer_id = p_officer_id,
        approval_date = CURDATE(),
        approved_at = CURRENT_TIMESTAMP,
        officer_comments = p_comments,
        override_flag = p_override
    WHERE loan_id = p_loan_id
      AND status IN ('pending','under_review');

    SET v_rows = ROW_COUNT();

    IF v_rows = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan is not pending or under review';
    END IF;

    CALL sp_generate_amortization_schedule(p_loan_id);

    COMMIT;
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vw_executive_portfolio_summary AS
SELECT
    SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) AS total_active_accounts,
    COALESCE(SUM(CASE WHEN a.status = 'active' THEN a.balance ELSE 0 END), 0.00) AS aggregate_deposits,
    COALESCE(AVG(CASE WHEN a.status = 'active' THEN a.balance END), 0.00) AS average_account_balance,
    (SELECT COALESCE(SUM(principal_amount), 0.00) FROM loans WHERE status = 'active') AS total_active_loan_exposure,
    (SELECT COALESCE(SUM(principal_amount), 0.00) FROM loans WHERE status = 'defaulted') AS total_defaulted_exposure,
    (SELECT COUNT(*) FROM loans WHERE status = 'pending') AS pending_loan_applications,
    (SELECT ROUND(
        100.0 * SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) /
        NULLIF(SUM(CASE WHEN status IN ('active','closed','defaulted') THEN 1 ELSE 0 END), 0),
        2
     ) FROM loans) AS non_performing_loan_ratio_percentage
FROM accounts a;

CREATE OR REPLACE VIEW vw_officer_loan_performance AS
SELECT
    u.user_id AS officer_id,
    CONCAT(u.first_name, ' ', u.last_name) AS officer_name,
    COUNT(l.loan_id) AS total_processed_loans,
    SUM(CASE WHEN l.status IN ('approved','active') THEN 1 ELSE 0 END) AS approved_loans,
    SUM(CASE WHEN l.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_loans,
    COALESCE(SUM(CASE WHEN l.status IN ('approved','active') THEN l.principal_amount ELSE 0 END), 0.00) AS total_approved_capital,
    COALESCE(AVG(CASE WHEN l.status IN ('approved','active') THEN l.annual_interest_rate END), 0.00) AS average_approved_rate
FROM users u
LEFT JOIN loans l ON l.officer_id = u.user_id
WHERE u.role = 'loan_officer'
GROUP BY u.user_id, u.first_name, u.last_name;

INSERT INTO users (user_id, email, password_hash, first_name, last_name, role) VALUES
('11111111-1111-1111-1111-111111111111', 'aarav@example.com', 'demo_hash_1', 'Aarav', 'Mehta', 'customer'),
('11111111-1111-1111-1111-111111111112', 'maya@example.com', 'demo_hash_2', 'Maya', 'Singh', 'customer'),
('11111111-1111-1111-1111-111111111113', 'officer@example.com', 'demo_hash_3', 'Riya', 'Sharma', 'loan_officer'),
('11111111-1111-1111-1111-111111111114', 'admin@example.com', 'demo_hash_4', 'Kabir', 'Admin', 'risk_admin');

INSERT INTO branches (branch_id, location, routing_code) VALUES
('22222222-2222-2222-2222-222222222221', 'Bengaluru Main Branch', 'ICB0001'),
('22222222-2222-2222-2222-222222222222', 'Delhi Central Branch', 'ICB0002');

INSERT INTO accounts (
    account_id, user_id, branch_id, account_number, type, balance, minimum_balance
) VALUES
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'ICB-SAV-1001', 'savings', 50000.00, 1000.00),
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222221', 'ICB-SAV-1002', 'savings', 20000.00, 1000.00),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'ICB-ESC-1001', 'escrow', 0.00, 0.00);

INSERT INTO beneficiaries (user_id, payee_name, routing_number, account_number) VALUES
('11111111-1111-1111-1111-111111111111', 'Maya Singh', 'ICB0001', 'ICB-SAV-1002');

INSERT INTO security_logs (user_id, ip_address, device_fingerprint, auth_status) VALUES
('11111111-1111-1111-1111-111111111111', '192.168.1.10', 'demo-device-a1', 'success'),
('11111111-1111-1111-1111-111111111113', '192.168.1.20', 'demo-device-o1', 'success');

INSERT INTO transactions (
    transaction_id, reference_number, source_account_id, destination_account_id, type, amount, description
) VALUES
('66666666-6666-6666-6666-666666666661', 'OPEN-A1001', NULL, '33333333-3333-3333-3333-333333333331', 'deposit', 50000.00, 'Opening balance'),
('66666666-6666-6666-6666-666666666662', 'OPEN-A1002', NULL, '33333333-3333-3333-3333-333333333332', 'deposit', 20000.00, 'Opening balance');

INSERT INTO loans (
    loan_id, borrower_id, mongodb_credit_profile_id,
    principal_amount, annual_interest_rate, term_months, status
) VALUES (
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111111',
    '64b000000000000000000001',
    120000.00,
    0.1200,
    12,
    'pending'
);

INSERT INTO collateral (loan_id, type, estimated_value, valuation_date) VALUES
('44444444-4444-4444-4444-444444444441', 'Vehicle', 250000.00, CURDATE());

-- Demo
SELECT account_number, balance
FROM accounts
WHERE account_id IN (
    '33333333-3333-3333-3333-333333333331',
    '33333333-3333-3333-3333-333333333332'
)
ORDER BY account_number;

CALL sp_transfer_funds(
    '33333333-3333-3333-3333-333333333331',
    '33333333-3333-3333-3333-333333333332',
    5000.00,
    'Demo transfer',
    @transaction_id
);

SELECT @transaction_id AS generated_transaction_id;

SELECT account_number, balance
FROM accounts
WHERE account_id IN (
    '33333333-3333-3333-3333-333333333331',
    '33333333-3333-3333-3333-333333333332'
)
ORDER BY account_number;

SELECT reference_number, type, amount, status
FROM transactions
ORDER BY created_at DESC
LIMIT 3;

SELECT account_id, old_balance, new_balance, delta_amount
FROM account_audit_log
ORDER BY audit_id;

CALL sp_approve_loan(
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111113',
    'Demo approval after risk review',
    FALSE
);

SELECT loan_id, status, principal_amount, annual_interest_rate, term_months, officer_id
FROM loans
WHERE loan_id = '44444444-4444-4444-4444-444444444441';

SELECT installment_number, due_date, principal_due, interest_due, total_due, is_settled
FROM loan_repayments
WHERE loan_id = '44444444-4444-4444-4444-444444444441'
ORDER BY installment_number
LIMIT 5;

SELECT * FROM vw_executive_portfolio_summary;

SELECT officer_name, total_processed_loans, approved_loans, rejected_loans,
       total_approved_capital, average_approved_rate
FROM vw_officer_loan_performance;
