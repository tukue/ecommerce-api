# Federated Identity Integration Guide

This document describes the **federated identity feature** — a multi-provider authentication system that allows users to authenticate via open-source identity providers (Logto, Dex, Keycloak, Authentik, Zitadel, and any OIDC-compliant IdP) alongside the existing local JWT auth.

---

## Overview

The federated identity system extends the original dual-mode auth (local HS256 + external RS256) into a **multi-provider OIDC federation**:

| Auth Mode | Algorithm | Scope |
|-----------|-----------|-------|
| Local JWT | HS256 | First-party email/password users |
| Federated OIDC | RS256 via JWKS | Any number of external IdPs |

### Architecture

```
                           ┌──────────────────────┐
                           │  Identity Providers   │
                           │  (DB-stored config)   │
                           └──────────┬───────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────┐
│                        Auth Middleware                               │
│                                                                      │
│  ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐     │
│  │ getBearerToken│    │ Local HS256    │    │ Federation Router│     │
│  │ (extract JWT) │───►│ verify(jwtSec) │───►│ resolve issuer   │     │
│  └──────────────┘    └────────────────┘    │ │ → JWKS verify   │     │
│                                            │ │ → auto-provision│     │
│                                            └──────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────────┐
                    │     Federation Service            │
                    │     services/federationService.js  │
                    │                                    │
                    │  ┌──────────┐  ┌───────────────┐  │
                    │  │ Discovery │  │ JWKS Client   │  │
                    │  │ (OIDC    │  │ Pool (issuer  │  │
                    │  │  metadata)│  │ → jwksClient) │  │
                    │  └──────────┘  └───────────────┘  │
                    └──────────────────────────────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────────┐
                    │     Linking Service               │
                    │     services/linkingService.js     │
                    │                                    │
                    │  ┌────────────────────────────┐   │
                    │  │ user_identities table      │   │
                    │  │ user ← provider + subject  │   │
                    │  │ (one user, many IdPs)      │   │
                    │  └────────────────────────────┘   │
                    └──────────────────────────────────┘
```

### Data Model

**`identity_providers`** — stores provider configuration

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(100) | Unique identifier (e.g. `keycloak-prod`) |
| `display_name` | VARCHAR(200) | User-facing label (e.g. "Company SSO") |
| `provider_type` | VARCHAR(50) | `oidc`, `saml`, `oauth2` |
| `issuer` | VARCHAR(255) | OIDC issuer URL (unique) |
| `jwks_uri` | VARCHAR(255) | Null → auto-discovered |
| `auth_endpoint` | VARCHAR(255) | Null → auto-discovered |
| `token_endpoint` | VARCHAR(255) | Null → auto-discovered |
| `client_id` | VARCHAR(255) | OIDC client ID |
| `client_secret` | VARCHAR(255) | Encrypted at rest |
| `scopes` | VARCHAR(255) | Default: `openid profile email` |
| `enabled` | BOOLEAN | Toggle without deleting |
| `config` | JSONB | Provider-specific overrides |

**`user_identities`** — links local users to IdP identities

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users(id) |
| `provider_id` | UUID | FK → identity_providers(id) |
| `subject` | VARCHAR(512) | `sub` claim from IdP |
| `email` | VARCHAR(255) | Email from IdP at link time |
| `raw_claims` | JSONB | Snapshot of IdP claims |
| `last_login_at` | TIMESTAMPTZ | Last successful login |

**Unique constraint:** `(provider_id, subject)` — prevents duplicate links.

---

## Setup

### Prerequisites

- Node.js 20+, PostgreSQL 15+
- Docker + Docker Compose (for bundled IdP containers)
- One or more OIDC-compliant identity providers

### Installation

```bash
# 1. Install dependencies
npm ci

# 2. Run migrations
npx sequelize-cli db:migrate

# 3. Configure environment (see below)
cp .env.example .env

# 4. Start the app
node server.js
```

### Environment Configuration

```env
# ── Existing Auth (unchanged) ──
JWT_SECRET=your-strong-secret-at-least-32-chars
JWT_EXPIRES_IN=1h

# ── Federated Identity ──
FED_SESSION_SECRET=<random-64-char-hex-secret>

# Seed providers on startup (JSON array)
FED_PROVIDERS=[{
  "name": "keycloak-prod",
  "type": "oidc",
  "issuer": "http://localhost:8080/realms/ecommerce",
  "client_id": "ecommerce-api",
  "client_secret": "your-client-secret",
  "scopes": "openid profile email roles",
  "enabled": true
}]

# Alternative: load providers from database on startup
FED_PROVIDER_DB_ENABLED=true
```

> **Note:** `FED_PROVIDERS` is a startup seed. For production, set `FED_PROVIDER_DB_ENABLED=true` and manage providers via API or directly in the DB.

### Docker Compose (with bundled IdPs)

```yaml
# docker-compose.yml additions
services:
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev --import-realm
    environment:
      KC_HOSTNAME: localhost
      KC_HTTP_PORT: 8080
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: ${POSTGRES_USER:-postgres}
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-admin}
    volumes:
      - ./keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  dex:
    image: ghcr.io/dexidp/dex:v2.41.1
    volumes:
      - ./dex/config.yaml:/etc/dex/config.yaml:ro
    ports:
      - "5556:5556"
    depends_on:
      postgres:
        condition: service_healthy

  logto:
    image: svhd/logto:latest
    environment:
      LOGTO_ENDPOINT: http://localhost:3001
      ADMIN_ENDPOINT: http://localhost:3002
      DB_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/logto
      TRUST_PROXY_HEADER: "true"
    ports:
      - "3001:3001"
      - "3002:3002"
    depends_on:
      postgres:
        condition: service_healthy
```

```bash
# Start everything including IdPs
docker compose up --build
```

---

## API Reference

### Authentication Endpoints

#### `GET /api/fed/providers`

Returns all enabled identity providers for the login screen.

```
GET /api/fed/providers

Response 200:
{
  "providers": [
    {
      "name": "keycloak-prod",
      "display_name": "Company SSO",
      "type": "oidc",
      "auth_url": "/api/fed/login/keycloak-prod"
    },
    {
      "name": "dex",
      "display_name": "Dex (LDAP)",
      "type": "oidc",
      "auth_url": "/api/fed/login/dex"
    }
  ]
}
```

#### `GET /api/fed/login/:provider`

Redirects the browser to the IdP's authorization endpoint.

```
GET /api/fed/login/keycloak-prod

→ 302 Redirect to:
https://keycloak.example.com/realms/ecommerce/protocol/openid-connect/auth
  ?client_id=ecommerce-api
  &redirect_uri=http://localhost:5004/api/fed/callback/keycloak-prod
  &response_type=code
  &scope=openid+profile+email+roles
  &state=<anti-forgery-state>
```

- `:provider` — the `name` from `identity_providers` table
- Requires no prior authentication
- State parameter is generated and validated to prevent CSRF

#### `GET /api/fed/callback/:provider`

OIDC authorization code callback. Exchanges code for tokens, provisions or links the user, and sets a session cookie.

```
GET /api/fed/callback/keycloak-prod?code=<auth-code>&state=<state>

→ 302 Redirect to / (or ?redirect= URL)
Response sets session cookie.
```

- On first login: auto-provisions a new local user account
- On subsequent logins: returns existing linked user
- Fails with `401` if the authorization code is invalid or expired

#### `POST /api/fed/logout`

Clears the local OIDC session.

```
POST /api/fed/logout

Response 200:
{ "message": "Logged out successfully" }
```

### Identity Linking Endpoints

#### `POST /api/fed/link/:provider`

Initiates linking an IdP identity to the currently authenticated user.

```
POST /api/fed/link/keycloak-prod
Authorization: Bearer <local-jwt>

→ 302 Redirect to IdP authorization endpoint
  (same flow as login but with custom state marking it as a link operation)
```

- Requires valid JWT in `Authorization` header
- After IdP callback, the `sub` claim is linked to `req.user`

#### `DELETE /api/fed/link/:identityId`

Unlinks an identity from the current user.

```
DELETE /api/fed/link/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <local-jwt>

Response 200:
{ "message": "Identity unlinked successfully" }
```

- `:identityId` — UUID from `user_identities` table
- Returns `403` if the identity belongs to another user
- Returns `400` if it is the user's only login method

#### `GET /api/fed/identities`

Lists all linked identities for the current user.

```
GET /api/fed/identities
Authorization: Bearer <local-jwt>

Response 200:
{
  "identities": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "provider": "keycloak-prod",
      "provider_display_name": "Company SSO",
      "subject": "abc123-def456",
      "email": "alice@company.com",
      "last_login_at": "2026-06-09T12:00:00Z",
      "linked_at": "2026-06-01T10:00:00Z"
    }
  ]
}
```

### Admin Endpoints

#### `POST /api/admin/fed/providers`

Register a new identity provider.

```
POST /api/admin/fed/providers
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "name": "authentik-prod",
  "display_name": "Authentik SSO",
  "provider_type": "oidc",
  "issuer": "https://authentik.example.com/application/o/ecommerce/",
  "client_id": "ecommerce-api",
  "client_secret": "encrypted-at-rest",
  "scopes": "openid profile email",
  "enabled": true
}

Response 201:
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "authentik-prod",
  "issuer": "https://authentik.example.com/application/o/ecommerce/",
  "enabled": true
}
```

#### `PUT /api/admin/fed/providers/:id`

Update provider configuration.

```
PUT /api/admin/fed/providers/660e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "display_name": "Authentik - Production",
  "enabled": false
}

Response 200:
{ "message": "Provider updated successfully" }
```

#### `DELETE /api/admin/fed/providers/:id`

Disable and remove a provider.

```
DELETE /api/admin/fed/providers/660e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <admin-jwt>

Response 200:
{ "message": "Provider deleted successfully" }
```

#### `GET /api/admin/fed/providers`

List all providers (including disabled).

```
GET /api/admin/fed/providers
Authorization: Bearer <admin-jwt>

Response 200:
{
  "providers": [
    {
      "id": "660e8400...",
      "name": "keycloak-prod",
      "display_name": "Company SSO",
      "type": "oidc",
      "issuer": "http://localhost:8080/realms/ecommerce",
      "enabled": true,
      "created_at": "2026-06-01T00:00:00Z",
      "last_used_at": "2026-06-09T12:00:00Z"
    }
  ]
}
```

---

## Route Protection Matrix

| Method | Endpoint | Auth | Admin |
|--------|----------|------|-------|
| GET | `/api/fed/providers` | — | — |
| GET | `/api/fed/login/:provider` | — | — |
| GET | `/api/fed/callback/:provider` | — | — |
| POST | `/api/fed/logout` | Session | — |
| POST | `/api/fed/link/:provider` | JWT | — |
| DELETE | `/api/fed/link/:identityId` | JWT | — |
| GET | `/api/fed/identities` | JWT | — |
| POST | `/api/admin/fed/providers` | JWT | Yes |
| PUT | `/api/admin/fed/providers/:id` | JWT | Yes |
| DELETE | `/api/admin/fed/providers/:id` | JWT | Yes |
| GET | `/api/admin/fed/providers` | JWT | Yes |

---

## Token Verification Flow

When a request arrives with a `Bearer <token>`, the middleware resolves the correct IdP:

```
Authorization: Bearer <token>
    │
    ├─ 1. Decode JWT without verification to read `iss` and `kid`
    │
    ├─ 2. Look up `identity_providers` by matching `iss` claim
    │     └─ Not found? → 401 "Unknown token issuer"
    │
    ├─ 3. Get or create a JWKS client for that issuer
    │     (cached in memory by issuer URL)
    │
    ├─ 4. Fetch the specific signing key matching the `kid`
    │     (cached by `kid` with TTL, respects JWKS Cache-Control headers)
    │
    ├─ 5. jwt.verify(token, publicKey, {
    │       algorithms: ['RS256'],
    │       issuer: provider.issuer,
    │       audience: provider.client_id
    │     })
    │     └─ Invalid signature? → 401 "Invalid token"
    │
    ├─ 6. Look up `user_identities` by (provider_id, decoded.sub)
    │     ├─ Found? → return linked user, update last_login_at
    │     └─ Not found?
    │         ├─ Email exists on another user? → link this sub to that user
    │         └─ No match? → auto-provision new user + link
    │
    └─ 7. Set req.user → next()
```

### Fallback order

```
1. OIDC session cookie (express-openid-connect)
2. Local HS256 JWT (jwt.verify with JWT_SECRET)
3. Federated RS256 JWT (per-issuer JWKS verification)
```

Steps 1-2 preserve full backward compatibility with the original auth system.

---

## Identity Provisioning Logic

`FederationService.provisionUser(provider, decodedToken)`

| Scenario | Action |
|----------|--------|
| `sub` found in `user_identities` | Update `last_login_at`, return linked user |
| `sub` not found, `email` not found in `users` | Create user + create `user_identities` row |
| `sub` not found, `email` exists on another user | Link `user_identities` to that existing user |
| `sub` not found, no email in token | Return `null` (cannot provision) |

### Username generation

For auto-provisioned users, the username is derived from:
1. `preferred_username` claim (if present)
2. `name` claim → lowercased, spaces → underscores
3. `email` → prefix before `@`

Collisions are resolved by appending `_2`, `_3`, etc.

---

## Adding a New Provider

### Via Admin API

```bash
curl -X POST http://localhost:5004/api/admin/fed/providers \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "authentik-prod",
    "display_name": "Authentik",
    "provider_type": "oidc",
    "issuer": "https://authentik.example.com/application/o/ecommerce/",
    "client_id": "ecommerce-api",
    "client_secret": "your-client-secret",
    "scopes": "openid profile email",
    "enabled": true
  }'
```

### Keycloak specifics

```bash
# Create a client in Keycloak:
# 1. Open Admin Console → http://localhost:8080/admin
# 2. Create realm "ecommerce" (or import realm-export.json)
# 3. Clients → Create → Client ID: "ecommerce-api"
# 4. Client authentication: ON
# 5. Valid redirect URIs: http://localhost:5004/api/fed/callback/keycloak-prod
# 6. Save → Credentials tab → copy Client Secret
```

### Dex specifics

```yaml
# dex/config.yaml
issuer: http://localhost:5556
storage:
  type: sqlite3
  config:
    file: /var/dex/dex.db
web:
  http: 0.0.0.0:5556
staticClients:
  - id: ecommerce-api
    redirectURIs:
      - 'http://localhost:5004/api/fed/callback/dex'
    name: 'E-Commerce API'
    secret: your-client-secret
connectors:
  - type: ldap
    id: ldap
    name: LDAP
    config:
      host: ldap.example.com:389
      bindDN: cn=admin,dc=example,dc=com
      bindPW: admin-password
      userSearch:
        baseDN: ou=users,dc=example,dc=com
        filter: "(objectClass=person)"
        username: uid
        idAttr: uid
        emailAttr: mail
        nameAttr: cn
```

### Authentik specifics

```
# In Authentik Admin:
# 1. Applications → Providers → Create OAuth2/OpenID Provider
# 2. Redirect URIs: http://localhost:5004/api/fed/callback/authentik-prod
# 3. Client ID: ecommerce-api
# 4. Client Secret: generated
# 5. Scopes: openid, profile, email
# 6. Applications → Create Application → Link to provider
# 7. Issuer URL: https://authentik.example.com/application/o/ecommerce/
```

### Logto specifics

```bash
# 1. Open Logto Admin Console at http://localhost:3002
# 2. Create account and tenant
# 3. Applications → Create Application → "Traditional Web"
#    - Name: "E-Commerce API"
#    - Redirect URIs: http://localhost:5004/api/fed/callback/logto
#    - Post sign-out redirect URIs: http://localhost:5004
# 4. Copy App ID → client_id, App Secret → client_secret
# 5. API Resources → Create API Resource
#    - API Identifier: http://localhost:5004
# 6. Grant "E-Commerce API" access to the resource
```

```env
FED_PROVIDERS=[{
  "name": "logto",
  "type": "oidc",
  "issuer": "http://localhost:3001/oidc",
  "client_id": "<app-id-from-admin>",
  "client_secret": "<app-secret-from-admin>",
  "scopes": "openid profile email",
  "enabled": true
}]
```

---

## Backward Compatibility

### Existing local JWT users

- All `POST /api/auth/login` and `POST /api/auth/register` flows are untouched
- Existing HS256 tokens remain valid
- Existing rate limiters continue to apply

### Existing external Auth0 integration

If you previously used Auth0 as the single external provider:

1. The original `AUTH_DOMAIN`, `AUTH_AUDIENCE` env vars are still supported but deprecated
2. Run the backfill migration to move the Auth0 config into `identity_providers`
3. Existing Auth0-issued tokens with the `iss` claim matching the original issuer continue to verify
4. Migration path:
   ```
   Old env vars → FED_PROVIDERS entry for Auth0 → remove old env vars
   ```

### Middleware chain

The `authMiddleware` in `middleware/authMiddleWare.js` delegates to `FederationService` for external token verification. Code that depended on `authenticateExternalToken()` continues to work through the delegation layer.

---

## Local Development

### Quick start with Logto

```bash
# 1. Start the full stack
docker compose up --build

# 2. Logto Admin Console is at http://localhost:3002
#    Create account, create application (see Logto specifics above)

# 3. Configure the app
export FED_PROVIDERS='[{
  "name": "logto",
  "type": "oidc",
  "issuer": "http://localhost:3001/oidc",
  "client_id": "<app-id>",
  "client_secret": "<app-secret>",
  "scopes": "openid profile email",
  "enabled": true
}]'

# 4. Verify provider discovery
curl http://localhost:5004/api/fed/providers
# → { "providers": [{ "name": "logto", ... }] }
```

### Testing with multiple providers

```bash
# Add a Dex provider alongside Logto
export FED_PROVIDERS='[
  {
    "name": "logto",
    "type": "oidc",
    "issuer": "http://localhost:3001/oidc",
    "client_id": "<app-id>",
    "client_secret": "<app-secret>",
    "scopes": "openid profile email",
    "enabled": true
  },
  {
    "name": "dex-dev",
    "type": "oidc",
    "issuer": "http://localhost:5556",
    "client_id": "ecommerce-api",
    "client_secret": "...",
    "scopes": "openid profile email groups",
    "enabled": true
  }
]'
```

### Disabling federation

Leave `FED_PROVIDERS` unset (or empty array) and `FED_PROVIDER_DB_ENABLED=false`. The system falls back to purely local JWT auth — no code changes needed.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `services/federationService.js` | Multi-provider token verification, provider resolution |
| `services/discoveryService.js` | OIDC well-known config discovery |
| `services/linkingService.js` | User-to-identity link/unlink operations |
| `services/authProvider.js` | Extended: multi-issuer JWKS client pool |
| `repositories/federationRepository.js` | Data access for providers + user identities |
| `controllers/federationController.js` | Federation endpoint handlers |
| `routes/federationRoutes.js` | Federation route definitions |
| `middleware/federatedAuth.js` | Dynamic express-openid-connect middleware factory |
| `middleware/authMiddleWare.js` | Updated: delegates external verification to federation service |
| `models/identityProvider.js` | Sequelize model |
| `models/userIdentity.js` | Sequelize model |
| `models/user.js` | Updated: hasMany UserIdentity association |
| `utils/federationValidators.js` | Zod schemas for federation endpoints |
| `config/federation.js` | Startup config loader |
| `migrations/*-add-identity-providers.js` | Create identity_providers table |
| `migrations/*-add-user-identities.js` | Create user_identities table |
| `migrations/*-backfill-user-identities.js` | Migrate auth_subject data |
| `migrations/*-drop-auth-subject.js` | Remove deprecated column |
| `keycloak/realm-export.json` | Keycloak realm configuration |
| `dex/config.yaml` | Dex configuration |

---

## Metrics & Observability

### Prometheus metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `fed_token_verifications_total` | Counter | `provider`, `result` | Token verification attempts |
| `fed_jwks_cache_hits_total` | Counter | `provider` | JWKS cache hits |
| `fed_jwks_cache_misses_total` | Counter | `provider` | JWKS cache misses |
| `fed_provisioning_total` | Counter | `action` | User provisioning events |
| `fed_provider_health` | Gauge | `provider` | 1 = healthy, 0 = unhealthy |

### Logged events

```json
{
  "level": "info",
  "message": "Federated token verified",
  "provider": "logto",
  "subject": "abc123",
  "userId": "550e8400-...",
  "duration_ms": 30,
  "correlationId": "req-abc-123"
}
```

```json
{
  "level": "warn",
  "message": "Unknown token issuer",
  "issuer": "https://evil-idp.example.com",
  "correlationId": "req-def-456"
}
```

### Health checks

Each enabled provider is periodically checked:

```
GET /health/fed/providers

Response 200:
{
  "providers": [
    { "name": "keycloak-prod", "status": "up",  "latency_ms": 12 },
    { "name": "dex",           "status": "up",  "latency_ms": 8 },
    { "name": "authentik",     "status": "down", "latency_ms": 0, "error": "Connection refused" }
  ]
}
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Client secret exposure | Encrypted at rest in `identity_providers` using AES-256-GCM |
| Rogue provider injection | Admin-only endpoints; audit log on every provider mutation |
| Token replay | Short token expiry; `aud`/`azp` claim validation against `client_id` |
| Cross-tenant sub collision | Composite unique index `(provider_id, subject)` |
| JWKS cache poisoning | Validate JWKS response structure; in-memory cache with bounded TTL |
| CSRF on callback | State parameter with cryptographic nonce validation |
| Session hijacking | httpOnly + secure + sameSite cookies; session ID regeneration post-auth |
| Issuer mismatch | Strict `iss` claim verification against stored provider issuer |
| IdP outage | Health monitoring; `fed_provider_health` gauge; graceful 401 on verify failure (no crash) |

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `401 Unknown token issuer` | Token's `iss` claim doesn't match any `identity_providers.issuer` | Check the `iss` claim in the JWT; verify the provider's issuer URL is correct |
| `401 Invalid token` | JWKS endpoint unreachable or `kid` not found | Verify the IdP is running; check `GET <issuer>/.well-known/openid-configuration` |
| `302 redirect to /error` | OIDC callback failed (bad code or state mismatch) | Check that `redirect_uri` matches exactly what's registered in the IdP client |
| User not auto-provisioned | Token has no `email` claim | Ensure `email` scope is requested; add email scope to provider config |
| Wrong user linked | Email collision | Check `user_identities` for existing links; run the backfill migration |
| Rate limited on login | Too many auth attempts | Wait 15 minutes or adjust `authSensitiveLimiter` in dev |

---

## Migration from Single AuthSubject

If you were using the previous `authSubject`-based OAuth integration, run these steps:

```bash
# Step 1: Create new tables (no downtime)
npx sequelize-cli db:migrate --name 2026060x-add-identity-providers
npx sequelize-cli db:migrate --name 2026060x-add-user-identities

# Step 2: Backfill existing auth_subject data
npx sequelize-cli db:migrate --name 2026060x-backfill-user-identities

# Step 3: Verify data integrity
SELECT COUNT(*) FROM user_identities;
SELECT COUNT(*) FROM users WHERE auth_subject IS NOT NULL;
-- Both counts should match

# Step 4: Drop the old column (after verification)
npx sequelize-cli db:migrate --name 2026060x-drop-auth-subject
```

> **Rollback plan:** Step 4 is the only destructive step. If rollback is needed before Step 4, simply revert the migration. After Step 4, restore from backup.

---

## Related Documents

| Document | Description |
|----------|-------------|
| `docs/FEDERATED_IDENTITY_INTEGRATION.md` | Detailed analysis of provider options, architecture decisions, and implementation planning |
| `docs/OAUTH_FLOW.md` | Original OAuth 2.0 / OIDC flow documentation |
| `docs/ARCHITECTURE.md` | Overall system architecture |
| `docs/PENDING_IMPROVEMENTS.md` | Prioritized improvement backlog |
