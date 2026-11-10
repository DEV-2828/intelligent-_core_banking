# Intelligent Core Banking & Commercial Credit Risk Engine

A Next.js banking prototype with a transactional MySQL ledger and MongoDB financial profiles and analytics. Customer, loan-officer and risk-admin dashboards cover the complete credit lifecycle.

## Requirements

- Node.js 24 or newer (the tests and maintenance commands use Node's TypeScript support).
- MySQL 8.0+.
- MongoDB 6+; the Windows local-start helper downloads MongoDB Community 8.0.25.
- npm.

## Setup

1. Run `npm ci`.
2. For a **new demo database only**, import `intelligent_core_banking_mysql.sql` in MySQL Workbench. That base script recreates the demo database. Existing installations should skip this import.
3. Copy `.env.example` to `.env.local` if a local configuration does not already exist. Set your database credentials and a random JWT secret of at least 32 characters.
4. Apply the workflow migrations:

```sh
npm run db:migrate
```

The migrations preserve banking data, track completed versions, and can be rerun. They add disbursement metadata, request deduplication, a synchronization outbox, audit event types and outstanding/overdue reporting. Do not run the historical `database/upgrade_final.sql` afterward: it predates these workflow procedures.

5. On Windows, start the local MongoDB instance, or use your existing MongoDB server:

```sh
npm run mongo:start
npm run db:setup:mongo
npm run db:check
```

The local server binds to 127.0.0.1:27017 and stores its data and log under ignored `.local/`. The first download is large and resumes if interrupted. This follows the [official MongoDB ZIP installation approach](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-windows-zip/). On macOS/Linux, start an installed MongoDB instance and skip `mongo:start`.

MongoDB setup installs the validator and indexes and inserts only missing demo profiles. Existing profiles are preserved. The old mongosh entry point is retired; use the npm command above.

6. Seed demo login passwords, then launch the app:

```sh
npm run seed:passwords
npm run dev
```

Open http://localhost:3000.

| Role | Email | Password |
|---|---|---|
| Customer | arjun@example.com | Customer@123 |
| Customer | neha@example.com | Customer@123 |
| Loan officer | officer@example.com | Officer@123 |
| Risk admin | admin@example.com | Admin@123 |

## Demonstration

1. **Customer:** review accounts and enter four recent consecutive quarterly statements under Financial profile. The demo profiles contain quarters ending in 2026 Q3; update their dates and figures when they become stale.
2. **Customer:** add a payee under Payments. **Admin:** verify the payee. **Customer:** transfer to that payee or another owned account.
3. **Customer:** apply for a loan and select an owned active INR payout account. Add collateral to the application if relevant.
4. **Officer:** review the saved risk assessment and verify collateral. Approve or reject with a decision note.
5. **Officer:** separately disburse the approved loan. The bank account is debited, the borrower is credited, one disbursement transaction is recorded, and the complete EMI schedule is generated atomically.
6. **Customer:** choose a repayment account and pay installments. All installments are visible, and the schedule can be printed. The final installment closes the loan.
7. **Admin:** inspect balance audits, pending credit synchronization and paginated overdue reporting. Exposure uses remaining principal.

Older demo loans may already say active without ever having been funded. The officer queue exposes these for explicit disbursement. Loans with existing settlements require manual reconciliation rather than silently regenerating their schedule.

## Credit model

MongoDB aggregation computes TTM DSCR, operating-cash-flow margin and current ratio from the latest four quarters. TypeScript validates inputs and computes the bounded, versioned academic score: bureau 30%, DSCR 40%, current ratio 20%, delinquency behavior 10%. Current ratio uses current assets. Zero debt or zero liabilities is displayed explicitly. Missing, duplicate, nonconsecutive, future-dated, stale and invalid figures fail assessment.

Each loan retains its model version, assessment time and financial inputs. Approval performs a fresh assessment. This is an academic decision-support model with self-reported/demo bureau inputs.

```sh
npm run risk:analyze
```

## Cross-database consistency

MySQL is authoritative for the banking transaction. Loan changes and their versioned synchronization events commit in the same SQL transaction. MongoDB stores one assessment/status record per loan. Delivery is idempotent and version-aware, so replaying an older event cannot overwrite a newer state.

If MongoDB is unavailable during delivery, committed banking state remains intact and its event remains queued. Creating a loan or freshly approving it still requires an available, valid financial profile. Retry pending events from the admin dashboard or run:

```sh
npm run sync:loans
```

The command is a one-shot drain of up to 100 events; run it repeatedly or arrange an external worker schedule for continuous delivery. This implementation replaces the earlier compensation/delete approach.

Money-changing APIs require an Idempotency-Key header. Reusing a key with the same actor, operation and details returns the saved result; changing its details returns a conflict. Interactive forms retain the key while retrying a request.

## Verification

```sh
npm run check
```

This runs lint, seven unit tests, a production build and twenty integration scenarios. Integration tests create fresh databases with generated `icb_test_` names, launch a separate Next.js server, call actual authenticated APIs and remove only their generated databases afterward. The MySQL test account needs permission to create and drop these test databases.

Coverage includes the complete lending lifecycle, all twelve EMIs, role/origin/ownership checks, disabled sessions, profile revision conflicts and legacy profile repair, payee verification, collateral controls, frozen accounts, insufficient funds, concurrent opposite transfers and double-spend attempts, competing decisions, duplicate disbursements/repayments, injected settlement rollback, MongoDB aggregation parity, an unreachable MongoDB delivery target, outbox replay and overdue reporting. The tests use HTTP and rendered HTML; they do not automate browser clicks.

GitHub Actions runs the same checks with isolated MySQL and MongoDB services. See `docs/IMPLEMENTATION.md` for the scrum breakdown and reviewer notes.

## Structure

- `app/`: role dashboards and authenticated API handlers.
- `components/`: forms, account controls, schedules, charts and feedback.
- `lib/banking.ts`: application, decision, disbursement, transfer and repayment orchestration.
- `lib/operations.ts`: transaction ownership and request deduplication.
- `lib/loan-sync.ts`: durable, monotonic MongoDB delivery.
- `lib/risk-calculator.ts`, `lib/risk-pipeline.ts`: validated scoring and native financial analytics.
- `database/migrations/`: non-destructive upgrades after the base schema import.
- `tests/`: deterministic unit checks and isolated real-database scenarios.

The code and migration scripts use MySQL. The older architecture PDF describes an earlier PostgreSQL design and is retained as historical project material.
