-- Run this only if you already imported the older database and do not want to recreate it.
USE intelligent_core_banking;
DROP PROCEDURE IF EXISTS sp_pay_loan_installment;
DELIMITER $$

CREATE PROCEDURE sp_pay_loan_installment(
    IN p_repayment_id CHAR(36),
    IN p_source_account_id CHAR(36),
    IN p_bank_repayment_account_id CHAR(36)
)
BEGIN
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

    START TRANSACTION;

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

    IF v_source_status <> 'active' OR v_destination_status <> 'active' THEN
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

    COMMIT;

    SELECT v_transaction_id AS transaction_id, v_total_due AS amount_paid,
           v_remaining_installments AS remaining_installments;
END$$

DELIMITER ;
