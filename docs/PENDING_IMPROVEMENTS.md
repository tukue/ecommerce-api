# Pending Improvements

Checklist of improvements needed to reach production readiness, ordered by impact.

---

## Security (Score: 6/10)

- [x] **Helmet security headers** — add `helmet` middleware for XSS/clickjacking/HSTS protection
- [ ] **Input validation library** — replace manual validation with Zod/Joi schemas on every endpoint
- [ ] **HTTP-only cookies** — move JWT from `localStorage` to `httpOnly`, `secure`, `sameSite` cookies
- [x] **Rate limiting on all endpoints** — currently only login has it; add to register, password reset, and all mutating endpoints
- [x] **Sanitize error messages** — ensure no internal details leak in production error responses

---

## Architecture Consistency (Score: 6/10)

- [x] **Extract service/repo layers** for Orders, Payments, and Auth — added `orderService`/`paymentService`/`authService` and matching repositories
- [x] **Standardize error handling** — controllers now use the `asyncHandler` wrapper pattern; `asyncHandler` returns the wrapped promise for deterministic tests
- [x] **Rename `OrderRoutes.js` → `orderRoutes.js`** for naming consistency with all other route files
- [x] **Standardize field naming** — Orders now consistently use `total`; client-supplied totals are ignored and totals are calculated server-side
- [x] **Remove unused `views/products.ejs`** — deleted because no route renders it

---

## Production Readiness (Score: 7/10)

- [ ] **Database migrations** — replace `sequelize.sync({ alter: true })` with proper migration system (`sequelize-cli`)
- [ ] **Pagination** — add `page`/`limit` query params + response metadata to all list endpoints (products, orders, payments)
- [x] **Graceful shutdown timeout** — add forced shutdown after a timeout (e.g., 10s) to prevent hanging
- [ ] **Environment-specific config** — separate configs for development, test, staging, production (pool sizes, logging, etc.)

---

## Tooling & Code Quality (Score: 7/10)

- [x] **ESLint + Prettier** — add linting and formatting with CI enforcement
- [x] **Fix `.gitignore`** — stop ignoring `README.md` and `db_scripts.md`
- [x] **Remove duplicate route** — move `/request-reset` POST from `swagger.js` into `routes/authRoutes.js`

---

## Testing Gaps (Score: 7/10)

- [ ] **Integration tests for payment routes** — missing entirely
- [ ] **Integration tests for checkout flow** — existing tests mock Stripe but could be expanded
- [ ] **Integration tests for health endpoints** — `/health/live` and `/health/ready` untested
- [ ] **Edge case tests** — DB failures, expired JWT, invalid tokens, rate limiting, duplicate entries, expired password reset tokens

---

## Observability (Score: 8/10)

- [ ] **Business metrics** — add counters for orders created, payments processed, products sold
- [ ] **Structured logging in business logic** — currently only HTTP requests are logged; add logs to controllers/services for key decisions
- [ ] **Alert rules** — define Prometheus alerting rules for high 5xx rate, slow p99 latency, DB connectivity

---

## Quick Wins (< 1 hour each)

1. ~~Fix `.gitignore` to allow `README.md` and docs~~
2. ~~Rename `OrderRoutes.js` → `orderRoutes.js`~~
3. ~~Delete unused `views/products.ejs`~~
4. ~~Move `/request-reset` route from `swagger.js` to `authRoutes.js`~~
5. ~~Add forced shutdown timeout in `server.js`~~
6. ~~Add `helmet` middleware~~

---

## How to Track Progress

Re-score after each phase:

- **Phase 1 (Security fixes)** → goal: 8.5/10
- **Phase 2 (Architecture consistency)** → goal: 9/10
- **Phase 3 (Production readiness)** → goal: 9.5/10
- **Phase 4 (Tooling + tests + polish)** → goal: 10/10
