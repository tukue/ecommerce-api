# Architecture Overview

## Layers

1. **Routing Layer** (`routes/`): HTTP route definitions and endpoint grouping.
2. **Controller Layer** (`controllers/`): request/response orchestration.
3. **Service Layer** (`services/`): business rules and validation logic.
4. **Repository Layer** (`repositories/`): data-access abstractions over Sequelize models.
5. **Infrastructure Layer** (`config/`, `middleware/`, `utils/`): configuration, telemetry, logging, metrics, error handling.

## Reliability and Observability Path

- Every request receives a `x-correlation-id` and is logged in structured JSON.
- Metrics are exposed at `/metrics` in Prometheus format.
- OpenTelemetry traces are exported to Jaeger via OTLP.
- Health checks:
  - `/health/live`: process liveness
  - `/health/ready`: database readiness
- Graceful shutdown handles `SIGINT`/`SIGTERM` and closes HTTP server, DB pool, and tracer.

## Deployment Topology (docker-compose)

- `app` (Node.js API)
- `postgres` (database)
- `prometheus` (metrics scraping)
- `grafana` (dashboards)
- `jaeger` (trace storage and UI)
