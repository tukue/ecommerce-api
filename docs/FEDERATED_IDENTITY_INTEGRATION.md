# Federated Identity Integration with Open-Source Providers

## 1. Current State Analysis

The API implements a **dual-mode authentication system**:

| Mode | Algorithm | Key Material | Provider |
|------|-----------|-------------|----------|
| Local JWT | HS256 | Symmetric secret (`JWT_SECRET`) | First-party |
| External OAuth 2.0/OIDC | RS256 | JWKS endpoint | Auth0 (currently) |

### Current architecture strengths

- Provider-agnostic token verification via `authProvider.js` — JWKS-based RS256 verification works with **any** OIDC-compliant issuer
- Auto-provisioning via `provisionExternalUser()` — supports first-time login from any external IdP
- Single `authSubject` field on the User model for linking external identities
- `express-openid-connect` middleware for browser-based OIDC flows
- Clean fallback chain: local HS256 → external RS256

### Current limitations for multi-provider support

1. **Single issuer only** — `authProvider.js` initializes one JWKS client tied to one issuer
2. **No provider discovery** — IdP metadata (issuer, JWKS URI, auth endpoint) is hardcoded via env vars
3. **Single authSubject** — User model has one `authSubject` field, limiting users to one external identity link
4. **No provider registry** — no database or config-level registry mapping tenants/providers to their metadata
5. **No IdP-initiated SSO** — only SP-initiated login flow is supported
6. **No refresh token handling** — external tokens are verified but not refreshed
7. **No provider health checks** — no mechanism to detect IdP outages and fall back

---

## 2. Open-Source Identity Provider Candidates

### Tier 1 — Full OIDC Compliance (drop-in compatible)

| Provider | OIDC | JWKS | Auto-Discovery | MFA | Notes |
|----------|------|------|----------------|-----|-------|
| **Keycloak** | ✅ Full | ✅ | `/.well-known/openid-configuration` | ✅ | Most mature; Widest adoption; Easy docker-compose setup |
| **Dex** (dexidp) | ✅ Full | ✅ | `/.well-known/openid-configuration` | ❌ | Lightweight; Connectors (LDAP, SAML, GitHub); K8s-native |
| **Authentik** | ✅ Full | ✅ | `/.well-known/openid-configuration` | ✅ | All-in-one; Flows engine; Excellent UI |
| **Ory Hydra** | ✅ Full | ✅ | `/.well-known/openid-configuration` | ❌ | OAuth 2.0 only (no user mgmt); Pair with Ory Kratos for identity |
| **Zitadel** | ✅ Full | ✅ | `/.well-known/openid-configuration` | ✅ | Built-in RBAC; Audit logs; B2B multi-tenant |
| **Casdoor** | ✅ Full | ✅ | `/.well-known/openid-configuration` | ✅ | Go-based; Built-in UI; Social logins built-in |
| **Logto** | ✅ Full | ✅ | `/.well-known/openid-configuration` | ✅ | Developer-first; SDKs; MFA; RBAC |

### Tier 2 — Compatible with adapter layer

| Provider | Protocol | Integration Effort | Notes |
|----------|----------|-------------------|-------|
| **FusionAuth** (CE) | OAuth 2.0/OIDC | Low | JWKS + OIDC compliant; Community edition is free |
| **ORY Kratos** | OAuth 2.0 + custom API | Medium | Identity + user management; Pairs with Hydra |
| **Gluu Server** | OIDC/SAML/FIDO2 | Low | Full IAM suite; CE available |
| **SimpleSAMLphp** | SAML 2.0 | High | SAML-only; Requires bridge/adapter |

---

## 3. Proposed Architecture — Multi-Provider Federation

```
┌───────────────────────────────────────────────────────────────────────┐
│                          Client                                       │
│  SPA / Mobile / CLI                                                    │
└──────────────────────┬────────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    Express Middleware Pipeline                          │
│                                                                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌───────────────────┐   │
│  │CORS/     │  │Rate       │  │ Validate    │  │ IdentityProvider  │   │
│  │Helmet    │  │Limiter    │  │(Zod schema) │  │ Resolver          │   │
│  └──────────┘  └──────────┘  └────────────┘  └────────┬──────────┘   │
│                                                        │               │
│                                                        ▼               │
│                                              ┌────────────────────┐   │
│                                              │  FederationRouter   │   │
│                                              │  (routes/fed.js)    │   │
│                                              └────────┬───────────┘   │
└─────────────────────────────────────────────────────────┼─────────────┘
                                                          │
                                                          ▼
                                    ┌──────────────────────────────────┐
                                    │        Federation Service         │
                                    │    services/federationService.js  │
                                    │                                    │
                                    │  ┌────────────────────────────┐   │
                                    │  │ Provider Registry          │   │
                                    │  │ ┌─────────┐ ┌──────────┐  │   │
                                    │  │ │Keycloak │ │  Dex     │  │   │
                                    │  │ │(prod)   │ │(staging) │  │   │
                                    │  │ └─────────┘ └──────────┘  │   │
                                    │  │ ┌─────────┐ ┌──────────┐  │   │
                                    │  │ │Authentik│ │ Zitadel  │  │   │
                                    │  │ └─────────┘ └──────────┘  │   │
                                    │  └────────────────────────────┘   │
                                    │                                    │
                                    │  ┌────────────────────────────┐   │
                                    │  │ Token Resolver              │   │
                                    │  │ (delegates to authProvider  │   │
                                    │  │  per issuer/key set)       │   │
                                    │  └────────────────────────────┘   │
                                    └──────────────────────────────────┘
                                                          │
                                                          ▼
                                    ┌──────────────────────────────────┐
                                    │      User Linking Service         │
                                    │  (multiple authSubjects per user)│
                                    └──────────────────────────────────┘
```

### 3.1 New Database Schema

#### `identity_providers` table

```sql
CREATE TABLE identity_providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,        -- e.g., "keycloak-prod"
  display_name  VARCHAR(200) NOT NULL,        -- e.g., "Company SSO"
  provider_type VARCHAR(50) NOT NULL,         -- "oidc", "saml", "oauth2"
  issuer        VARCHAR(255) NOT NULL UNIQUE, -- e.g., "https://keycloak.example.com/realms/myrealm"
  jwks_uri      VARCHAR(255),                 -- auto-discovered if null
  auth_endpoint VARCHAR(255),                 -- auto-discovered if null
  token_endpoint VARCHAR(255),                -- auto-discovered if null
  client_id     VARCHAR(255) NOT NULL,
  client_secret VARCHAR(255),                 -- encrypted at rest
  scopes        VARCHAR(255) DEFAULT 'openid profile email',
  enabled       BOOLEAN DEFAULT true,
  config        JSONB,                        -- provider-specific configuration
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

#### `user_identities` table (replaces single `authSubject` column)

```sql
CREATE TABLE user_identities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id   UUID NOT NULL REFERENCES identity_providers(id) ON DELETE CASCADE,
  subject       VARCHAR(512) NOT NULL,         -- "sub" claim from IdP
  email         VARCHAR(255),
  raw_claims    JSONB,                         -- snapshot of IdP claims on last login
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, subject)
);
```

#### Migration from existing `authSubject`

The current `users.auth_subject` column is migrated into `user_identities`:

1. Add a "legacy" provider entry in `identity_providers` for the current Auth0 config
2. INSERT into `user_identities` for all users with `auth_subject` set
3. The `authSubject` column becomes nullable/deprecated, then removed

**Migration sequence:**

```
Migration 3: Create identity_providers + user_identities tables
Migration 4: Backfill user_identities from users.auth_subject
Migration 5: Drop users.auth_subject column (after verification)
```

---

## 4. Provider Discovery — OIDC Auto-Discovery

The OIDC Discovery spec (`/.well-known/openid-configuration`) is used to dynamically resolve provider metadata:

```
Request:  GET https://keycloak.example.com/realms/myrealm/.well-known/openid-configuration
Response:
{
  "issuer": "https://keycloak.example.com/realms/myrealm",
  "authorization_endpoint": "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/auth",
  "token_endpoint": "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/token",
  "jwks_uri": "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/certs",
  "id_token_signing_alg_values_supported": ["RS256"],
  ...
}
```

**Implementation approach:**

```js
// services/discoveryService.js
async function discoverProvider(issuer) {
  const wellKnown = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const response = await fetch(wellKnown);
  if (!response.ok) throw new Error(`Discovery failed for ${issuer}`);
  return response.json();
}
```

Providers are optionally configured with just `issuer` + `client_id` + `client_secret`; the rest is auto-discovered. Overrides are supported for non-standard providers.

---

## 5. Multi-Provider Token Verification

The `authProvider.js` is extended to support multiple JWKS clients keyed by issuer:

```js
// services/authProvider.js
const jwksClients = new Map(); // issuer -> jwksClient

function getOrCreateClient(issuer, jwksUri) {
  if (jwksClients.has(issuer)) return jwksClients.get(issuer);
  const client = jwksRsa({
    jwksUri: jwksUri || `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
  });
  jwksClients.set(issuer, client);
  return client;
}

async function verifyToken(token, { issuer, audience }) {
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader?.header?.kid) throw new InvalidTokenError();

  const client = getOrCreateClient(issuer);
  const publicKey = await getSigningKey(client, decodedHeader.header.kid);

  return jwt.verify(token, publicKey, {
    audience,
    issuer,
    algorithms: ['RS256'],
  });
}
```

**Verification flow:**

```
Request with Bearer <token>
  │
  ├─ 1. Decode JWT header (extract `kid`, `iss`)
  │
  ├─ 2. Look up provider by `iss` claim
  │     └─ Not found? → 401 "Unknown issuer"
  │
  ├─ 3. Get or create JWKS client for that issuer
  │
  ├─ 4. Fetch signing key matching `kid`
  │
  ├─ 5. Verify RS256 signature
  │
  └─ 6. On success → provision/link user
```

---

## 6. Browser-Based OIDC Flow (express-openid-connect)

The `express-openid-connect` middleware is configured per provider using a **dynamic middleware factory**:

```js
// middleware/federatedAuth.js
const { auth } = require('express-openid-connect');

function createOidcMiddleware(provider) {
  return auth({
    issuerBaseURL: provider.issuer,
    baseURL: provider.baseURL,
    clientID: provider.clientId,
    clientSecret: provider.clientSecret,
    secret: process.env.OIDC_SESSION_SECRET,
    authorizationParams: {
      scope: provider.scopes || 'openid profile email',
      audience: provider.audience,
    },
    routes: {
      login: false,    // custom routes
      logout: false,
      callback: false,
    },
  });
}
```

**Route structure:**

```
GET  /api/fed/login/:provider     → Redirect to IdP
GET  /api/fed/callback/:provider  → OIDC callback → provision user
POST /api/fed/logout              → Clear local session
GET  /api/fed/providers           → List enabled providers
```

---

## 7. Configuration

### Environment Variables

```env
# ── Federated Identity ──
FED_SESSION_SECRET=<random-64-char-secret>

# Provider definitions (JSON array or DB-seeded)
FED_PROVIDERS=[{
  "name": "keycloak-prod",
  "type": "oidc",
  "issuer": "https://keycloak.example.com/realms/ecommerce",
  "client_id": "ecommerce-api",
  "client_secret": "...",
  "scopes": "openid profile email",
  "enabled": true
}]

# Provider discovery (alternative: load from DB)
FED_PROVIDER_DB_ENABLED=true
```

### Database-Seeded Providers

For production, providers are stored in `identity_providers` table and loaded at startup:

```js
// config/federation.js
async function loadFederationConfig(models) {
  const providers = await models.IdentityProvider.findAll({ where: { enabled: true } });
  for (const provider of providers) {
    if (provider.provider_type === 'oidc') {
      const metadata = await discoverProvider(provider.issuer);
      // Merge metadata with stored config
      initOidcProvider({ ...provider, ...metadata });
    }
  }
}
```

---

## 8. Provider-Specific Configuration Examples

### Keycloak

```env
FED_PROVIDERS=[{
  "name": "keycloak-prod",
  "type": "oidc",
  "issuer": "https://keycloak.example.com/realms/ecommerce-realm",
  "client_id": "ecommerce-api",
  "client_secret": "your-client-secret",
  "scopes": "openid profile email roles",
  "audience": "ecommerce-api",
  "config": {
    "role_mapping": {
      "admin": "ecommerce-admin",
      "user": "ecommerce-user"
    }
  }
}]
```

**docker-compose addition:**

```yaml
keycloak:
  image: quay.io/keycloak/keycloak:26.0
  environment:
    KC_HOSTNAME: keycloak.example.com
    KC_DB: postgres
    KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
    KC_DB_USERNAME: ${POSTGRES_USER}
    KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
    KEYCLOAK_ADMIN: admin
    KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
  ports:
    - "8080:8080"
  depends_on:
    postgres:
      condition: service_healthy
```

### Dex (dexidp)

```yaml
# dex.config.yaml
issuer: https://dex.example.com
storage:
  type: sqlite3
  config:
    file: /var/dex/dex.db
web:
  http: 0.0.0.0:5556
grpc:
  addr: 0.0.0.0:5557
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

```env
FED_PROVIDERS=[{
  "name": "dex",
  "type": "oidc",
  "issuer": "https://dex.example.com",
  "client_id": "ecommerce-api",
  "client_secret": "your-client-secret",
  "scopes": "openid profile email groups"
}]
```

### Authentik

```env
FED_PROVIDERS=[{
  "name": "authentik",
  "type": "oidc",
  "issuer": "https://authentik.example.com/application/o/ecommerce/",
  "client_id": "ecommerce-api",
  "client_secret": "your-client-secret",
  "scopes": "openid profile email authentik:goauthentik.io",
  "config": {
    "group_mapping": true
  }
}]
```

### Zitadel

```env
FED_PROVIDERS=[{
  "name": "zitadel",
  "type": "oidc",
  "issuer": "https://zitadel.example.com",
  "client_id": "123456789@ecommerce",
  "client_secret": "your-client-secret",
  "scopes": "openid profile email",
  "config": {
    "org_id": "org-abc123"
  }
}]
```

### Ory Hydra + Kratos

```env
FED_PROVIDERS=[{
  "name": "ory-hydra",
  "type": "oidc",
  "issuer": "https://hydra.example.com",
  "client_id": "ecommerce-api",
  "client_secret": "your-client-secret",
  "scopes": "openid profile email offline_access",
  "config": {
    "hydra_admin_url": "https://hydra-admin.example.com"
  }
}]
```

---

## 9. User Linking Strategy

### Multiple identities per user

Users can link multiple IdP accounts to a single local account:

```
User: alice@example.com
  ├─ Keycloak:  sub="kc|abc123"
  ├─ Google:    sub="google|xyz789"
  └─ Local:     password auth
```

**Linking flow:**

```
POST /api/fed/link/:provider  (authenticated, redirect to IdP)
  → User authenticates at IdP
  → Callback verifies token
  → Creates user_identities row linked to current req.user
  → "Account linked successfully"
```

**Unlinking flow:**

```
DELETE /api/fed/link/:provider/:identityId  (authenticated)
  → Removes user_identities row
  → Warning if last login method
```

### Provisioning decisions

| Scenario | Action |
|----------|--------|
| First login, `sub` not found, `email` not found | Create new user + link |
| `sub` not found, `email` matches existing user | Link `sub`, return existing user |
| `sub` matches existing user | Login (return user) |
| `sub` matches but email differs | Trust the `sub` mapping (IdP is source of truth) |

---

## 10. Implementation Plan

### Phase 1: Foundation (estimated: 2-3 days)

| Task | Files | Description |
|------|-------|-------------|
| 1.1 Create `identity_providers` migration | `migrations/2026060x000000-add-identity-providers.js` | New table for provider config |
| 1.2 Create `user_identities` migration | `migrations/2026060x000001-add-user-identities.js` | New table for user-idp links |
| 1.3 Backfill migration | `migrations/2026060x000002-backfill-user-identities.js` | Migrate existing `authSubject` data |
| 1.4 Drop `authSubject` migration | `migrations/2026060x000003-drop-auth-subject.js` | Remove old column |
| 1.5 Create IdentityProvider model | `models/identityProvider.js` | Sequelize model |
| 1.6 Create UserIdentity model | `models/userIdentity.js` | Sequelize model |
| 1.7 Update User model | `models/user.js` | Add `hasMany UserIdentity` association |

### Phase 2: Multi-Provider Core (estimated: 3-4 days)

| Task | Files | Description |
|------|-------|-------------|
| 2.1 Extend authProvider | `services/authProvider.js` | Multi-issuer JWKS client pool |
| 2.2 Create discovery service | `services/discoveryService.js` | OIDC auto-discovery |
| 2.3 Create federation service | `services/federationService.js` | Provider resolution, token verification routing |
| 2.4 Create user linking service | `services/linkingService.js` | Multi-identity link/unlink logic |
| 2.5 Create federation middleware | `middleware/federatedAuth.js` | Dynamic OIDC middleware factory |
| 2.6 Update auth middleware | `middleware/authMiddleWare.js` | Delegate to federation service for token verification |

### Phase 3: API & Routes (estimated: 2-3 days)

| Task | Files | Description |
|------|-------|-------------|
| 3.1 Create federation routes | `routes/federationRoutes.js` | Login, callback, logout, link, unlink, list providers |
| 3.2 Create federation controller | `controllers/federationController.js` | Request handling |
| 3.3 Create federation validators | `utils/federationValidators.js` | Zod schemas |
| 3.4 Create federation repository | `repositories/federationRepository.js` | Data access for providers + identities |

### Phase 4: Frontend & UI (estimated: 1-2 days)

| Task | Description |
|------|-------------|
| 4.1 Update login EJS | Provider selector ("Login with Keycloak", "Login with Dex", etc.) |
| 4.2 Update profile EJS | "Linked Accounts" section (list, link, unlink) |
| 4.3 Add callback redirect views | Post-authentication redirect handling |

### Phase 5: Docker & DevOps (estimated: 1-2 days)

| Task | Description |
|------|-------------|
| 5.1 Add Keycloak to docker-compose | Keycloak service + PostgreSQL database |
| 5.2 Add Dex to docker-compose | Dex service + config |
| 5.3 Add setup scripts | Realm/client configuration automation |
| 5.4 Update CI | Smoke tests for federation flows |

### Phase 6: Testing (estimated: 2-3 days)

| Task | Files | Description |
|------|-------|-------------|
| 6.1 Federation service tests | `tests/federationService.test.js` | Multi-issuer verification, discovery |
| 6.2 Federation middleware tests | `tests/federationMiddleware.test.js` | OIDC flow simulation |
| 6.3 Federation controller tests | `tests/federationController.test.js` | Request→response cycle |
| 6.4 User linking tests | `tests/linkingService.test.js` | Link/unlink/provision scenarios |
| 6.5 Integration tests | `tests/federation.integration.test.js` | Full provider→token→user flow |

---

## 11. Backward Compatibility

### API backward compatibility

- All existing auth endpoints (`/api/auth/login`, `/api/auth/register`, etc.) remain unchanged
- Existing local JWT tokens continue to work
- The `authSubject` column migration is non-breaking:
  1. Phase 1.1-1.2: New tables created (no impact on existing code)
  2. Phase 1.3: Backfill runs (existing data preserved)
  3. Phase 1.4: `authSubject` column dropped **only after** verification

### Token backward compatibility

- Existing HS256 local tokens continue to verify via `authProvider.verifyLocalToken()`
- Existing RS256 tokens from the original Auth0 issuer continue to verify — the issuer is added as the first `identity_providers` entry
- The `authMiddleware` fallback chain (local HS256 → external RS256) is preserved

### Middleware backward compatibility

```js
// The original single-issuer flow still works:
const user = await authenticateExternalToken(req, token);
// Becomes:
const user = await federationService.verifyToken(token);
// Both code paths resolve to the same outcome
```

---

## 12. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Client secrets at rest | Encrypt `client_secret` in `identity_providers` table using AES-256-GCM with app-level key |
| Provider impersonation | Validate `iss` claim matches the expected provider's issuer; Enforce HTTPS for all provider URIs |
| JWKS cache poisoning | Validate JWKS response is valid JSON; Validate `kid` matches expected format; In-memory cache with TTL |
| Token replay | Short token expiry (configurable); `azp`/`aud` claim validation |
| Cross-tenant linking | User identity links are scoped to provider + subject; Prevent `sub` collision across providers via composite unique index |
| Rogue provider injection | Admin-only API for managing identity providers; Audit logging on provider CRUD |
| Session fixation | Regenerate session ID post-authentication; Use `sameSite: 'lax'` on cookies |

---

## 13. Monitoring & Observability

### Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `fed_token_verifications_total` | Counter | `provider`, `result` (success/failure) | Total token verifications |
| `fed_discovery_requests_total` | Counter | `provider`, `result` | OIDC discovery requests |
| `fed_provisioning_actions_total` | Counter | `action` (create/link/skip) | User provisioning actions |
| `fed_jwks_cache_hits_total` | Counter | `provider` | JWKS cache hit count |
| `fed_jwks_cache_misses_total` | Counter | `provider` | JWKS cache miss count |
| `fed_provider_health` | Gauge | `provider` | 1 = healthy, 0 = unhealthy |

### Logging

```js
logger.info('Federated token verified', {
  provider: provider.name,
  subject: decoded.sub,
  userId: user.id,
  duration_ms: elapsed,
});
```

### Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| ProviderDown | `fed_provider_health == 0` for > 1min | Critical |
| HighTokenVerificationFailures | `rate(fed_token_verifications_total{result="failure"}[5m]) > 10` | Warning |
| DiscoveryFailure | `fed_discovery_requests_total{result="failure"}` > 0 | Warning |

---

## 14. docker-compose Additions

```yaml
version: "3.9"
services:
  # ... existing app, postgres, prometheus, grafana, jaeger ...

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
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 5

  dex:
    image: ghcr.io/dexidp/dex:v2.41.1
    volumes:
      - ./dex/config.yaml:/etc/dex/config.yaml:ro
    ports:
      - "5556:5556"
    depends_on:
      postgres:
        condition: service_healthy
```

---

## 15. File Reference Summary

### New files

| File | Purpose |
|------|---------|
| `migrations/*-add-identity-providers.js` | Create identity_providers table |
| `migrations/*-add-user-identities.js` | Create user_identities table |
| `migrations/*-backfill-user-identities.js` | Backfill from auth_subject |
| `migrations/*-drop-auth-subject.js` | Drop deprecated column |
| `models/identityProvider.js` | Sequelize model |
| `models/userIdentity.js` | Sequelize model |
| `services/discoveryService.js` | OIDC auto-discovery |
| `services/federationService.js` | Multi-provider token logic |
| `services/linkingService.js` | Identity link/unlink logic |
| `repositories/federationRepository.js` | Data access layer |
| `controllers/federationController.js` | Request handling |
| `routes/federationRoutes.js` | Route definitions |
| `utils/federationValidators.js` | Zod schemas |
| `middleware/federatedAuth.js` | Dynamic OIDC middleware |
| `config/federation.js` | Federation config loader |
| `tests/federationService.test.js` | Tests |
| `tests/federationController.test.js` | Tests |
| `tests/federationMiddleware.test.js` | Tests |
| `tests/linkingService.test.js` | Tests |
| `tests/federation.integration.test.js` | Integration tests |
| `keycloak/realm-export.json` | Keycloak realm config |
| `dex/config.yaml` | Dex config |

### Modified files

| File | Change |
|------|--------|
| `models/user.js` | Add `hasMany UserIdentity` association; remove `authSubject` field (after migration) |
| `models/index.js` | Register new models + associations |
| `services/authProvider.js` | Support multi-issuer JWKS client pool |
| `services/authService.js` | Delegate external provisioning to federation service |
| `middleware/authMiddleWare.js` | Use federation service for token verification |
| `config/env.js` | Add federation config env vars |
| `.env.example` | Add federation env var stubs |
| `app.js` | Mount federation routes; init federation config |
| `docker-compose.yml` | Add Keycloak, Dex services |
| `views/login.ejs` | Add provider selector buttons |
| `views/profile.ejs` | Add linked accounts section |
| `docs/OAUTH_FLOW.md` | Update to reflect multi-provider architecture |

---

## 16. Decision Matrix — Which Provider to Add First

| Criteria | Keycloak | Dex | Authentik | Zitadel | Casdoor | Logto |
|----------|----------|-----|-----------|---------|---------|-------|
| docker-compose ease | ✅ Easy | ✅ Easy | ✅ Easy | ✅ Easy | ✅ Easy | ✅ Easy |
| OIDC compliance | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| MFA support | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| RBAC / role mapping | ✅ Built-in | ❌ (connector-based) | ✅ Built-in | ✅ Built-in | ✅ Built-in | ✅ Built-in |
| Admin UI | ✅ | ❌ (CLI/API only) | ✅ | ✅ | ✅ | ✅ |
| User management | ✅ | ❌ (uses connectors) | ✅ | ✅ | ✅ | ✅ |
| Documentation quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Community size | Largest | Large | Medium | Medium | Small | Medium |
| Resource footprint | Heavy (Java) | Light (Go) | Medium (Python) | Medium (Go) | Medium (Go) | Medium (TS) |

**Recommendation: Keycloak first, then Dex.**

- **Keycloak** for the primary integration — most complete feature set, best documentation, and the industry standard for open-source IAM
- **Dex** for the lightweight alternative — demonstrates provider diversity and the connector pattern (LDAP, SAML, GitHub)

---

## 17. Summary

The current codebase is well-positioned for federated identity integration. The key changes are:

1. **Database** — Replace single `authSubject` column with `identity_providers` + `user_identities` tables for true multi-identity support
2. **Token verification** — Extend `authProvider.js` to support multiple JWKS clients keyed by issuer
3. **Provider discovery** — Implement OIDC auto-discovery for dynamic metadata resolution
4. **Middleware** — Create a dynamic OIDC middleware factory for browser-based flows per provider
5. **API** — Add federation routes for login, callback, linking, and provider management
6. **Infrastructure** — Add Keycloak and Dex to docker-compose for local development

Total estimated effort: **11-17 days** across all phases. Core integration (Phases 1-3) can be completed in **7-10 days**.
