# Implementation Action Plan

This plan breaks the backend portfolio improvements into small, verifiable steps. The goal is to make the repository look and behave like a system that can be shipped and operated in production.

## Phase 1: Stabilize the delivery foundation

### Step 1. Lock in database schema management

- Completed: startup now checks DB connectivity without mutating schema.
- Completed: `npm run migrate` applies versioned migrations from `migrations/`.
- Completed: CI validates migrations against PostgreSQL before backend tests.

### Step 2. Keep CI focused and reliable

- Run backend and frontend tests in separate GitHub Actions jobs.
- Make test env vars explicit in the workflow.
- Add a future placeholder job for migrations or linting if desired.

### Step 3. Document the runtime contract

- Update README and docs to explain required environment variables.
- Document local setup, observability stack, and deployment assumptions.

## Phase 2: Improve observability

### Step 4. Add dashboards

- Create Grafana dashboards for request latency, request volume, error rate, and in-flight requests.
- Add a database health panel and a trace overview panel.

### Step 5. Add alerting

- Define alerts for elevated 5xx rates, slow requests, and database connectivity failures.
- Document thresholds and expected operator responses.

### Step 6. Improve log usability

- Keep logs structured and correlation-friendly.
- Add examples showing how to search logs using `correlationId`.

## Phase 3: Strengthen reliability

### Step 7. Protect critical flows

- Add idempotency keys for checkout/payment requests.
- Add safer retry handling for transient external failures.
- Confirm user-facing error messages are stable and actionable.

### Step 8. Add resilience checks

- Add tests for failure paths and timeout behavior.
- Verify graceful shutdown covers HTTP, database, and tracing cleanup.

## Phase 4: Raise portfolio quality

### Step 9. Expand test coverage

- Add integration tests for the checkout flow.
- Add contract-style tests for important API responses.
- Add tests for health and metrics endpoints.

### Step 10. Add production notes

- Create a short runbook for common failures.
- Document deployment assumptions and rollback strategy.
- List future enhancements in the README and docs.

## Step-by-step execution order

1. Migrations
2. CI hardening
3. Documentation refresh
4. Dashboards
5. Alerts
6. Checkout reliability
7. Integration and contract tests
8. Runbooks and final polish

## Definition of done

- The project can be explained as a backend system with observable production behavior.
- CI runs the full relevant test suite.
- Observability is documented and visible in the repository.
- Reliability improvements are planned and tracked clearly.
