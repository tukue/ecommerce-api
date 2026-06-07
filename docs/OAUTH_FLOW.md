# OAuth 2.0 + OpenID Connect Authentication Flow

This document explains the authentication architecture of the e-commerce API — a dual-mode system supporting **local JWT authentication** and **external OAuth 2.0 / OpenID Connect** (designed for Auth0, compatible with any OIDC provider). Both modes coexist and are verified through a single middleware pipeline.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Client (SPA / Mobile / CLI)                    │
│                                                                         │
│  ┌──────────────────────┐    ┌──────────────────────────────────────┐   │
│  │ Local Login           │    │ OAuth Login (redirect)              │   │
│  │ POST /api/auth/login  │    │ /login ──► Auth0 ──► /callback      │   │
│  └────────┬─────────────┘    └──────────┬───────────────────────────┘   │
└───────────┼──────────────────────────────┼──────────────────────────────┘
            │                              │
            ▼                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     Express Middleware Pipeline                          │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌─────────┐ │
│  │CORS/     │  │Rate       │  │ Validate    │  │ Auth     │  │Admin    │ │
│  │Helmet    │  │Limiter    │  │(Zod schema) │  │Middleware│  │Check    │ │
│  └──────────┘  └──────────┘  └────────────┘  └──────────┘  └─────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
              ┌─────────────────────────────────────┐
              │         authMiddleware               │
              │  (verifies identity, sets req.user)  │
              └─────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          ┌─────────────────┐             ┌───────────────────┐
          │  Local Strategy   │             │  OAuth Strategy    │
          │  (HS256 JWT)      │             │  (RS256 via JWKS)  │
          └─────────────────┘             └───────────────────┘
```

---

## Dual-Mode Authentication Strategy

The system supports two authentication methods simultaneously, with a **local-first, external-fallback** strategy:

| Mode                   | Algorithm | Key Material                    | Use Case                                        |
| ---------------------- | --------- | ------------------------------- | ----------------------------------------------- |
| **Local JWT**          | HS256     | Symmetric secret (`JWT_SECRET`) | First-party users (email/password registration) |
| **External OAuth 2.0** | RS256     | Public key from JWKS endpoint   | Third-party identity (Auth0, Google, etc.)      |

### Why dual-mode?

- **Offline resilience** — the API can authenticate users without depending on an external provider
- **Gradual migration** — existing local users continue working while new users authenticate via OAuth
- **Simpler testing** — local JWTs are used in CI and test suites without external dependencies
- **Flexible deployment** — external auth is optional; the system works fully with local auth alone

---

## OAuth 2.0 Token Verification Flow (RS256)

This is the core OAuth flow — verifying access tokens issued by an external identity provider using public key cryptography.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         OAuth Token Verification                         │
│                                                                          │
│  HTTP Request with Authorization: Bearer <token>                        │
│                                    │                                     │
│                                    ▼                                     │
│  1. Extract Bearer token from Authorization header                       │
│                                    │                                     │
│                                    ▼                                     │
│  2. Decode JWT header (no verification yet)                              │
│     ┌──────────────────────────────┐                                     │
│     │ Header: {                    │                                     │
│     │   "alg": "RS256",            │                                     │
│     │   "kid": "abc123",           │ ◄── Extract Key ID                  │
│     │   "typ": "JWT"               │                                     │
│     │ }                            │                                     │
│     └──────────────────────────────┘                                     │
│                                    │                                     │
│                                    ▼                                     │
│  3. Fetch signing key from JWKS endpoint                                 │
│     GET https://{domain}/.well-known/jwks.json                          │
│     ┌──────────────────────────────┐                                     │
│     │ {                            │                                     │
│     │   "keys": [                  │                                     │
│     │     {                        │                                     │
│     │       "kid": "abc123",       │ ◄── Match by kid                    │
│     │       "kty": "RSA",          │                                     │
│     │       "alg": "RS256",        │                                     │
│     │       "n": "...",            │ ◄── RSA modulus                     │
│     │       "e": "AQAB"            │ ◄── RSA exponent                    │
│     │     }                        │                                     │
│     │   ]                          │                                     │
│     │ }                            │                                     │
│     └──────────────────────────────┘                                     │
│                                    │                                     │
│                                    ▼                                     │
│  4. Verify token signature using the RSA public key                      │
│     jwt.verify(token, publicKey, {                                       │
│       algorithms: ['RS256'],                                             │
│       audience: 'https://api.example.com',                               │
│       issuer: 'https://tenant.auth0.com/'                               │
│     })                                                                   │
│                                    │                                     │
│                                    ▼                                     │
│  5. If valid ──► extract claims (sub, email, name)                      │
│     If invalid ──► 401 Unauthorized                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Why RS256 and not HS256 for external tokens?

| Property          | RS256 (asymmetric)                               | HS256 (symmetric)                                  |
| ----------------- | ------------------------------------------------ | -------------------------------------------------- |
| Key distribution  | Public key shared, private key secret            | Same secret used to sign and verify                |
| Trust model       | Anyone can verify, only issuer can sign          | Both parties must trust each other with the secret |
| Key rotation      | Clients fetch new public key from JWKS           | All clients must be updated with new secret        |
| Security boundary | Provider's private key never leaves their server | Shared secret must be stored by every verifier     |

For a third-party identity provider, **RS256 is the industry standard** — it allows the API to verify tokens without ever possessing the signing key.

---

## JWKS (JSON Web Key Sets) — How Public Keys Are Managed

JWT headers contain a `kid` (Key ID) field. The API uses this to fetch the correct public key from the provider's JWKS endpoint.

```
   ┌──────────┐     GET /.well-known/jwks.json     ┌──────────┐
   │          │ ─────────────────────────────────►  │          │
   │   API    │                                     │  Auth0   │
   │  Server  │ ◄─────────────────────────────────  │          │
   │          │     { keys: [ { kid: "...", ... } ] }│          │
   └──────────┘                                     └──────────┘
         │
         │  In-memory cache (TTL-based)
         │
         ▼
   Subsequent requests with same kid
   skip the HTTP fetch — cache hit
```

### Key rotation handling

When Auth0 rotates signing keys, the JWKS endpoint returns the new key with a new `kid`. The API's next verification automatically:

1. Sees the new `kid` in the JWT header
2. Fetches the updated JWKS (cache miss)
3. Verifies with the new public key

No deployment, configuration change, or restart is needed.

### Configuration

```js
// services/authProvider.js
function createJwksClient(issuer) {
  return jwksRsa({
    jwksUri: `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`,
    cache: true, // Avoid repeated fetches for the same key
    rateLimit: true, // Max 1 request per 10s per key to the JWKS endpoint
  });
}
```

---

## Token Verification Decision Tree

The `authMiddleware` implements a fallback chain:

```
Incoming Request
    │
    ├── OIDC session active? ──Yes──► Provision user from session ──► next()
    │
    └── No Bearer token? ──Yes──► 401 "No token provided"
         │
         ▼
    Try local HS256 verification
         │
         ├── Success ──► Set req.user ──► next()
         │
         └── Failure
              │
              ├── Token expired? ──Yes──► 401 "Token has expired"
              │
              ├── External auth disabled? ──Yes──► 401 "Invalid token"
              │
              └── External auth enabled ──► Try RS256 verification
                                              │
                                              ├── Success ──► Auto-provision user ──► next()
                                              │
                                              └── Failure ──► 401 "Invalid token"
```

### Key design decisions

1. **Local tokens are always tried first** — avoids unnecessary JWKS fetches for first-party users
2. **Expired tokens never fall through** — if a local token is expired, the user gets a 401 immediately rather than trying external verification
3. **External auth can be enabled/disabled** — controlled by `AUTH_DOMAIN` and `AUTH_AUDIENCE` environment variables; when disabled, the fallback path is skipped entirely

---

## Auto-Provisioning (Just-In-Time User Creation)

When an OAuth token is verified and the user doesn't exist locally, the system automatically provisions them:

```
Verified OAuth Token
    │
    ├── sub: "auth0|123"
    │    email: "alice@example.com"
    │    name: "Alice Smith"
    │
    ▼
AuthService.provisionExternalUser(decodedToken)
    │
    ├── 1. Look up by authSubject ("auth0|123")
    │       └── Found? ──Yes──► Return existing user
    │
    ├── 2. Look up by email ("alice@example.com")
    │       └── Found? ──Yes──► Link authSubject to this user ──► Return user
    │
    └── 3. No match ──► Create new user
         │
         ├── username: "alice_smith" (collision-safe)
         ├── email: "alice@example.com"
         ├── password: <random 48-char hex> (cannot log in locally)
         └── authSubject: "auth0|123"
              │
              ▼
         Return newly created user
```

This means external users are **automatically registered on first successful login** — no separate signup step is required.

---

## Rate Limiting Strategy

| Limiter            | Window | Max Requests | Where Applied                           |
| ------------------ | ------ | ------------ | --------------------------------------- |
| **Global API**     | 15 min | 100          | All `POST /api/auth/*` endpoints        |
| **Mutating**       | 15 min | 50           | POST/PUT/PATCH/DELETE on `/api/*`       |
| **Auth-sensitive** | 15 min | 5            | `/register`, `/request-reset`, `/reset` |
| **Login**          | 15 min | 5            | `/login`                                |

All limiters emit standard `RateLimit-*` headers and return a JSON error envelope when exceeded. Rate limiting is disabled in test environments.

---

## Route Protection Matrix

| Method | Endpoint                  | Auth Required | Admin Required |
| ------ | ------------------------- | ------------- | -------------- |
| POST   | `/api/auth/register`      | —             | —              |
| POST   | `/api/auth/login`         | —             | —              |
| GET    | `/api/auth/profile`       | Yes           | —              |
| POST   | `/api/auth/request-reset` | —             | —              |
| POST   | `/api/auth/reset`         | —             | —              |
| POST   | `/api/orders`             | Yes           | —              |
| GET    | `/api/orders/:id`         | Yes           | —              |
| POST   | `/api/products`           | Yes           | Yes            |
| PUT    | `/api/products/:id`       | Yes           | Yes            |
| DELETE | `/api/products/:id`       | Yes           | Yes            |
| POST   | `/api/checkout`           | Yes           | —              |
| GET    | `/api/products`           | —             | —              |

Public routes (products, health) do not require authentication. Admin-only routes check `req.user.role === 'admin'` after authentication.

---

## Test Coverage

The authentication system is tested at three levels:

| Test File                      | Scope       | What It Verifies                                                      |
| ------------------------------ | ----------- | --------------------------------------------------------------------- |
| `tests/authService.test.js`    | Unit        | Password hashing, user provisioning, token signing                    |
| `tests/authMiddleware.test.js` | Integration | Token verification, fallback behavior, expired tokens                 |
| `tests/authController.test.js` | Integration | Full request→response cycle: register, login, profile, password reset |

---

## Local Development Without OAuth

The API works fully with local authentication only:

```env
# No OAuth config needed — these are only required for external auth:
# AUTH_DOMAIN=
# AUTH_AUDIENCE=
# AUTH_CLIENT_ID=
# AUTH_CLIENT_SECRET=

JWT_SECRET=a-strong-random-secret-at-least-32-chars
JWT_EXPIRES_IN=1h
```

When these variables are absent, `auth.enabled` is `false`, and the middleware skips the JWKS initialization and external token fallback entirely.

---

## Environment Configuration

| Variable             | Required              | Purpose                                          |
| -------------------- | --------------------- | ------------------------------------------------ |
| `JWT_SECRET`         | Yes                   | HMAC secret for local JWTs (min 32 chars)        |
| `JWT_EXPIRES_IN`     | No                    | Local token lifetime (default `1h`)              |
| `AUTH_DOMAIN`        | For OAuth             | Auth0 tenant domain (e.g., `myapp.us.auth0.com`) |
| `AUTH_AUDIENCE`      | For OAuth             | API identifier in Auth0                          |
| `AUTH_ISSUER`        | No                    | Auto-derived from `AUTH_DOMAIN` if not set       |
| `AUTH_CLIENT_ID`     | For OIDC browser flow | Auth0 application client ID                      |
| `AUTH_CLIENT_SECRET` | For OIDC browser flow | Auth0 application client secret                  |

---

## Key Files Reference

| File                             | Purpose                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `middleware/authMiddleWare.js`   | Express middleware — token extraction, dual-mode verification, rate limiters, admin guard |
| `services/authProvider.js`       | OAuth token verification using JWKS (RS256)                                               |
| `services/authService.js`        | Local auth (register, login, password reset), external user provisioning                  |
| `repositories/authRepository.js` | Data access layer — user lookup, creation, auth subject linking                           |
| `config/env.js`                  | Auth configuration validation at startup                                                  |
| `app.js`                         | JWKS client initialization, OIDC middleware mounting, route registration                  |

---

## What This Design Demonstrates

- **Asymmetric cryptography in practice** — JWKS-based RS256 verification without ever handling private keys
- **Defense in depth** — rate limiting at multiple tiers, fallback between auth strategies, centralized error handling
- **Stateless token verification** — no session store required; tokens carry all necessary information
- **Zero-downtime key rotation** — new signing keys are picked up automatically from the JWKS endpoint
- **Separation of concerns** — auth logic is cleanly layered across middleware, services, and repositories
- **Production-aware defaults** — caching, rate limiting, graceful degradation when external providers are unavailable
