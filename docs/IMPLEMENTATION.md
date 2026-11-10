# Banking workflow scrum

Branch: codex/complete-banking-workflows. Starting point: b391d39.

| Step | Delivery | Commits |
|---|---|---:|
| 1 | Restore build/lint; repair async forms; expose complete schedules and repayment-account selection | 3 |
| 2 | Local MongoDB setup; recoverable connections; validated/versioned risk model; financial intake | 3 |
| 3 | Atomic funding; saved assessments; idempotent operations; durable versioned synchronization; payout/retry controls | 3 |
| 4 | Payee management and admin verification; collateral lifecycle; outstanding principal and overdue aging | 3 |
| 5 | Unit fixtures; HTTP/database lifecycle and failure tests; Mongo analytics parity; reproducible checks and documentation | 4 |

## Review notes

- No banking funds were moved by migrations or verification. Migrations add schema/procedures/views; integration scenarios operate only in freshly generated test databases.
- Existing database notebook edits are deliberately outside these commits.
- Loan approval records an approved commitment. Funding is a separate explicit action and creates the amortization schedule in the same transaction as the money movement.
- Stored procedures can own their transaction for direct SQL calls. Application operations set a connection-local workflow flag so nested procedures participate in the outer idempotency transaction. Connection-local flags and actor identity are cleared before pool release.
- SQL triggers write versioned loan events in the transaction that changes the loan. Outbox delivery holds its event lock while contacting MongoDB, acknowledges only success and keeps failed events for retry. MongoDB applies only newer versions.
- Client retry keys last through the current form interaction. The API guarantees deduplication when callers preserve their key; a new key represents a new transfer/application request.
- Financial profiles belong to borrowers; loan decisions and assessment history belong to loans. A decision on one loan does not overwrite another loan's status.
- Verified collateral cannot be removed by customers, and collateral changes stop after a credit decision.
- Overdue bands are derived from unpaid installments and do not automatically mark loans defaulted. Original principal remains visible in the contract; portfolio exposure uses remaining principal.
- Legacy active loans with zero settled installments may be funded explicitly. Legacy loans with settlements require manual reconciliation and are rejected by the funding procedure.
- Temporary server downloads, symbols and data are local runtime artifacts and are not part of the source distribution.

## Verification record

Completed locally on 10 November 2026 with Node 24.22.1, Next.js 16.4.3, MySQL and MongoDB 8.0.25. Lint, production build, seven unit tests and twenty HTTP/database integration scenarios pass. The hosted GitHub Actions workflow is configured here; its first hosted run occurs after pushing the branch.

The integration suite checks money conservation, exact-once funding and settlement, transaction/audit rollback after an injected failure, minimum balances under concurrent debits, conflicting officer decisions, native analytics parity and recovery from an unreachable MongoDB delivery endpoint. It also verifies profile repair, payee verification, collateral ownership, all twelve schedule rows, overdue aging and disabled-session access.

## Hosted runner compatibility fix

The initial push and pull-request checks passed lint, unit tests and compilation, then failed during database fixture setup. The MongoDB container refused to start on the new Ubuntu runner kernel (6.19+); fixture cleanup masked the original selection error with a topology-closed exception.

The workflow pins Ubuntu 22.04 (kernel 6.8), checks real TCP SQL readiness and MongoDB ping health, and uses the Node 24 editions of checkout/setup-node. This is a compatibility workaround tracked in [actions/runner-images#15005](https://github.com/actions/runner-images/issues/15005); re-evaluate the runner pin when MongoDB supports the newer kernels. Fixture cleanup only drops a MongoDB database after a successful connection, attempts every remaining cleanup action and preserves the setup failure. A dedicated unreachable-MongoDB regression verifies that no generated SQL database is left behind.
