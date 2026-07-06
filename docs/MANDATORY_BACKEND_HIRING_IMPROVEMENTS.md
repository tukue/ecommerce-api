# Mandatory Backend Hiring Improvements

This file lists only the changes that materially improve the repository as a backend developer hiring project. These are the items to mention first, then implement in priority order.

## 1. Reliable test suite

Why it matters: hiring reviewers expect a backend repository to prove that core behavior works.

Mandatory changes:

- Ensure `npm run test:backend` runs successfully from a clean checkout.
- Keep backend and frontend tests separated.
- Add or keep CI validation for backend tests.
- Cover core flows:
  - auth register/login
  - product CRUD
  - order creation
  - payment/checkout failure paths
  - health/readiness endpoints

Acceptance criteria:

- Backend tests pass locally and in CI.
- No test depends on a developer machine-specific state.

## 2. Explicit database migrations

Why it matters: automatic schema mutation at app startup is a production red flag.

Mandatory changes:

- Use versioned migrations for schema changes.
- Do not use `sequelize.sync({ alter: true })` in server startup.
- Run migrations explicitly before app startup in Docker/CI/deployment.
- Document how to run migrations locally.

Acceptance criteria:

- App startup checks database connectivity only.
- `npm run migrate` applies pending migrations.
- CI validates migrations against PostgreSQL.

## 3. API correctness and validation

Why it matters: reviewers notice mismatches between request payloads, controllers, and models.

Mandatory changes:

- Align controller fields with model fields.
- Validate all public request bodies and query parameters.
- Return consistent error responses.
- Avoid silently accepting invalid business data.

Acceptance criteria:

- Order creation stores the intended total amount correctly.
- Invalid input returns clear `400` responses.
- Not-found cases return clear `404` responses.

## 4. Authentication and security hardening

Why it matters: backend roles require secure handling of credentials, tokens, and secrets.

Mandatory changes:

- Never expose password reset tokens in production API responses.
- Enforce strong `JWT_SECRET` configuration.
- Add security headers with `helmet`.
- Rate-limit login, register, and password reset endpoints.
- Keep secrets out of source control.

Acceptance criteria:

- Auth endpoints do not leak sensitive data.
- Security defaults are documented in README.
- `.env.example` contains placeholders only.

## 5. Clean service boundaries

Why it matters: maintainable backend structure is more important than adding many features.

Mandatory changes:

- Keep controllers thin.
- Move business logic into services.
- Keep database access in repositories or model-specific data access modules.
- Use consistent route/file naming.

Acceptance criteria:

- Controllers mainly parse requests and return responses.
- Reusable business rules are covered by service tests.
- Naming is consistent, for example `orderRoutes.js` instead of mixed casing.

## 6. Recruiter-ready README

Why it matters: the README is often the first reviewed artifact.

Mandatory changes:

- Explain what the backend demonstrates.
- Provide setup commands.
- Provide test commands.
- Provide migration commands.
- List production-readiness features.
- Remove encoding issues and unclear wording.

Acceptance criteria:

- A reviewer can run the project from README alone.
- The README clearly communicates backend engineering value.

## Priority Order

1. Reliable backend tests
2. Explicit database migrations
3. API correctness and validation
4. Authentication/security hardening
5. Clean service boundaries
6. Recruiter-ready README

## Non-Mandatory For Hiring

These are useful later, but not mandatory before showing the project:

- Kubernetes manifests
- Full distributed tracing dashboards
- Advanced caching
- Message broker integration
- Complex load-testing pipeline
- Multi-cloud deployment automation
