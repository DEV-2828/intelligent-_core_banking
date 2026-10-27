# Intelligent Core Banking & Commercial Credit Risk Engine

A full-stack DBMS mini-project that combines an **ACID MySQL core-banking ledger** with a **MongoDB commercial credit-risk engine**, exposed through an impressive role-based **Next.js 16.4** banking interface.

## What the finished project demonstrates

- MySQL 8 relational design with PK/FK/CHECK/UNIQUE constraints and indexes
- Atomic account transfers using stored procedures, `FOR UPDATE`, deterministic lock ordering and rollback
- Trigger-based minimum-balance enforcement and balance audit logging
- Loan approval + automatic EMI/amortization schedule generation
- Atomic EMI payment and automatic loan closure after the final installment
- MongoDB borrower documents with schema validation and nested financial statements
- DSCR, operating cash-flow margin, current ratio and composite risk scoring
- Secure login with bcrypt password hashing, JWT HttpOnly sessions and role-based access control
- Customer, loan-officer and risk-admin dashboards
- Cross-database loan-approval orchestration with application-level compensation if MongoDB synchronization fails

## Technology stack

- Next.js 16.4 App Router / React 19.3 / TypeScript
- Tailwind CSS 4
- MySQL 8 + `mysql2`
- MongoDB 6/7+ + native Node driver
- `jose` JWT sessions + `bcryptjs`
- Recharts + Lucide icons

## Repository structure

```text
app/
  api/                         # authentication, transfers, loans, admin actions
  dashboard/
    customer/                  # overview, payments, credit & EMI schedule
    officer/                   # underwriting / approval cockpit
    admin/                     # risk command center
  login/
components/
  charts/
lib/
  data/                        # server-side dashboard queries
  auth.ts
  mysql.ts
  mongodb.ts
  risk.ts
scripts/
  seed-demo-passwords.mjs
intelligent_core_banking_mysql.sql
credit_risk_mongodb.js
database/upgrade_final.sql
proxy.ts
.env.example
```

## 1. Requirements

- Node.js 20.9+ (required by Next.js 16)
- MySQL 8.0+
- MongoDB 6 or 7+
- npm

## 2. Create the databases

### MySQL

Run `intelligent_core_banking_mysql.sql` in MySQL Workbench. It recreates the demo database, creates all tables/indexes/triggers/procedures/views, inserts demo data, approves Arjun's sample loan and creates its EMI schedule.

If you **already imported the older SQL file**, you can instead run `database/upgrade_final.sql` to replace only the repayment procedure with the final atomic version.

### MongoDB

From a terminal:

```bash
mongosh < credit_risk_mongodb.js
```

The Mongo database is named `credit_risk_engine`.

## 3. Configure the web application

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` with your MySQL password and set a long random `JWT_SECRET`.

Example:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=intelligent_core_banking
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=credit_risk_engine
JWT_SECRET=replace-this-with-a-long-random-value-at-least-32-characters
BANK_REPAYMENT_ACCOUNT_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3
BANK_DISBURSEMENT_ACCOUNT_ID=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4
```

## 4. Convert the demo password placeholders into real bcrypt hashes

The SQL file intentionally contains placeholder hashes. After the DB is imported and `.env.local` exists, run:

```bash
npm run seed:passwords
```

Demo logins:

| Role | Email | Password |
|---|---|---|
| Customer | `arjun@example.com` | `Customer@123` |
| Customer | `neha@example.com` | `Customer@123` |
| Loan officer | `officer@example.com` | `Officer@123` |
| Risk admin | `admin@example.com` | `Admin@123` |

## 5. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

For a final check before submission:

```bash
npm run lint
npm run build
```

## Best demonstration sequence

1. **Customer / Arjun** — login and show his account balance, active loan, EMI amount, risk tier and transaction trend.
2. Open **Payments** — transfer money to the verified beneficiary Neha. Explain that the UI calls `sp_transfer_funds`, which locks both account rows, validates the minimum balance, updates both balances, creates the transaction and commits atomically. Then show the audit trail as admin.
3. Open **Credit & loans** — show the automatically generated amortization schedule. Pay an EMI. The final procedure performs the debit, bank credit, transaction entry and EMI settlement in one transaction.
4. Login as **Neha** and submit a new loan request if you want to demonstrate application creation. The API links the new MySQL loan to her MongoDB profile and uses her risk tier to produce a demo recommended rate.
5. Login as **Officer** — the application appears in the underwriting cockpit with bureau score, DSCR, OCF margin, collateral and composite risk score. Approve it; the database generates the EMI schedule and the API synchronizes MongoDB.
6. Login as **Admin** — show system KPIs, loan-exposure chart, transaction-volume chart, trigger-generated audit logs and account freeze/unfreeze controls.

## Important viva architecture

```text
Browser / Next.js GUI
        |
        | authenticated API / server components
        v
Next.js application layer
   |                    |
   v                    v
MySQL 8              MongoDB
Core banking         Credit risk
- users              - borrower profile
- accounts           - bureau payload
- transactions       - financial statements
- loans              - underwriting status
- repayments         - DSCR / OCF / risk inputs
- audit logs
```

There is **no database-level foreign key between MySQL and MongoDB**. The application links them through `loans.mongodb_credit_profile_id` and the Mongo document `_id`, while the Mongo profile also stores the MySQL `borrower_id`.

## Cross-database consistency

A single ACID transaction cannot span MySQL and MongoDB in this prototype. For approval, the app therefore follows a small **Saga/compensation pattern**:

1. approve in MySQL and generate EMIs;
2. update MongoDB underwriting status;
3. if the Mongo update fails, compensate MySQL by removing the newly generated unpaid schedule and restoring the prior loan status.

This is a strong viva point because it shows the difference between **single-database ACID** and **application-level consistency across heterogeneous databases**.

## Risk-score disclaimer

The composite score and its weights are an academic demonstration model, not a validated real-world underwriting model. The application uses it to demonstrate NoSQL analytics and decision support.

## Final database improvement included here

The earlier `sp_pay_loan_installment` called `sp_transfer_funds`, which committed the money movement before the EMI row was marked settled. The final SQL in this repository fixes that: **money movement + repayment transaction + EMI settlement + final-loan closure happen inside one MySQL transaction.**
