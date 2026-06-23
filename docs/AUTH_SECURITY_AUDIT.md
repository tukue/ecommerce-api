# Auth Security Audit: OAuth 2.0 / OpenID Connect + Local JWT

## Architecture Summary

Dual-mode authentication in a Node.js/Express ecommerce API:

| Mode | Algorithm | Key Material | Purpose |
|------|-----------|-------------|---------|
| Local JWT | HS256 | Symmetric `JWT_SECRET` | First-party email/password users |
| External OAuth 2.0 / OIDC | RS256 | JWKS public key | Auth0 (or any OIDC provider) tokens |

Strategy: **local-first, external-fallback** in a single middleware pipeline. External auth is optional -- gated by `AUTH_DOMAIN` + `AUTH_AUDIENCE` env vars.

---

## Key Files & Functions

| File | Role |
|------|------|
| `middleware/authMiddleWare.js` | Dual-mode auth middleware (OIDC session -> local HS256 -> external RS256), 4 rate limiters, admin guard |
| `services/authProvider.js` | JWKS client init, `verifyToken()` RS256 via `jwks-rsa`, `verifyLocalToken()` HS256 |
| `services/authService.js` | `register()`, `login()`, `signToken()`, `provisionExternalUser()`, password reset, `provisionUserFromOidc/Token()` |
| `repositories/authRepository.js` | DB queries: `findByEmail`, `findByAuthSubject`, `linkAuthSubject`, `createUser` |
| `controllers/authController.js` | Route handlers: register, login, getProfile, request/reset password |
| `routes/authRoutes.js` | 5 endpoints with Zod validation + rate limiters |
| `config/env.js` | Validates `JWT_SECRET` >= 32 chars, derives `auth.enabled`, `auth.issuer` |
| `app.js:71-86` | Mounts `express-openid-connect` middleware (conditional), initializes JWKS |
| `public/js/login.js` | Client: POST credentials -> stores returned JWT in **localStorage** |
| `public/js/scripts.js` | Client: reads JWT from **localStorage** for `Authorization: Bearer` header; logout removes from localStorage |
| `models/user.js` | Sequelize User model: bcrypt hooks, `authSubject` field for OIDC linking |

---

## Auth Flows

### Local Login (email/password)
1. Client POSTs `{email, password}` to `/api/auth/login`
2. `authService.login()` verifies via `bcrypt.compare()`
3. Signs HS256 JWT: `{userId}` with `exp` = `JWT_EXPIRES_IN` (default 1h)
4. Returns JWT to client -> stored in `localStorage`
5. Subsequent requests attach `Authorization: Bearer <token>`

### OIDC Browser Flow (via `express-openid-connect`)
1. User hits `/login` -> middleware redirects to Auth0
2. Auth0 authenticates -> redirects to `/callback` with auth code
3. Middleware exchanges code for tokens, establishes encrypted cookie session
4. `authMiddleware` checks `req.oidc.isAuthenticated()` -> provisions user via `provisionUserFromOidc()`
5. User auto-provisioned locally (JIT) with `authSubject` = `sub` claim

### External Token Verification (API clients / RS256)
1. Request with `Authorization: Bearer <RS256 JWT>`
2. Local HS256 verification fails -> falls through to external
3. `authProvider.verifyToken()` decodes header, extracts `kid`, fetches matching JWK
4. Verifies RS256 signature, validates `audience` + `issuer` claims
5. Auto-provisions user via `provisionExternalUser()`

---

## Security Findings

| # | Finding | Severity | Location | Details |
|---|---------|----------|----------|---------|
| 1 | JWT stored in localStorage | **CRITICAL** | `public/js/login.js:33`, `profile.ejs:20` | Accessible to any JS (XSS -> token theft). No httpOnly cookie used. |
| 2 | No refresh token mechanism | **HIGH** | `authService.js:217-219` | 1h JWTs with no refresh. Users forced to re-login on expiry. No silent renewal. |
| 3 | Client-side logout does not invalidate OIDC session | **MEDIUM** | `profile.ejs:19-22` | Only removes localStorage token. `/logout` route exists but is not called server-side. |
| 4 | No CSRF/state parameter validation for OIDC flow | **MEDIUM** | `app.js:71-86` | `express-openid-connect` handles state internally but no explicit verification documented. |
| 5 | No PKCE for OAuth flow | **MEDIUM** | `app.js:71-86` | Authorization Code flow without PKCE. Uses client_secret instead. |
| 6 | Plaintext `AUTH_CLIENT_SECRET` in config | **MEDIUM** | `config/env.js:37` | Client secret loaded into memory from env. No encryption at rest. |
| 7 | Password reset has no email delivery | **LOW** | `authService.js:169-171` | Token generated but no email transport implemented. Flow is incomplete. |
| 8 | Specific error messages leak info | **LOW** | `authMiddleWare.js:118-121` | Distinguishes expired vs invalid vs internal error. Enables probing. |
| 9 | Rate limiting disabled in test mode | **LOW** | `authMiddleWare.js:11` | `NODE_ENV === 'test'` skip -- acceptable but must not leak to prod. |

---

## Recommended Fixes

### P0 -- Critical
1. **Replace localStorage with httpOnly cookies** -- Return JWT via `Set-Cookie` with `httpOnly`, `secure`, `sameSite=strict`. Use BFF (Backend-for-Frontend) pattern for SPA auth.

### P1 -- High
2. **Implement refresh token rotation** -- Add `/api/auth/refresh`. Short-lived access tokens (15 min) + long-lived refresh tokens (7 days) stored as httpOnly cookies or DB with rotation.
3. **Fix OIDC logout** -- Call `req.oidc.logout()` server-side. Add `/api/auth/logout` endpoint to clear OIDC session + invalidate cookie.

### P2 -- Medium
4. **Verify/force state + nonce** -- Ensure `express-openid-connect` config sets `state: true` and nonce is enabled for CSRF protection.
5. **Enable PKCE** -- Configure PKCE even for confidential clients (defense in depth).
6. **HTTPS enforcement** -- Add middleware to redirect HTTP -> HTTPS. Set `secure: true` on all cookies.

### P3 -- Low
7. **Generic error messages** -- Return uniform "Authentication failed" for all token validation errors. Log specifics server-side.
8. **Add jti claim** -- Include unique token ID in JWTs for potential revocation tracking.
9. **Key rotation for local JWTs** -- Support multiple valid `JWT_SECRET` values during rotation windows.

---

## Questions & Assumptions
- No email delivery is implemented for password reset -- the flow is incomplete
- `express-openid-connect` v2.x assumed to validate `state`/`nonce` by default -- verify in `^2.7.0`
- No session store configured (encrypted cookies only) -- multi-instance deployments need Redis
- Single role model (`user`/`admin`) -- no granular permissions or scoped tokens
- No MFA/2FA for local auth
