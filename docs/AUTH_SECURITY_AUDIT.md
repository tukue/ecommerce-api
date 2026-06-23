# Authentication Security Audit

## Architecture Summary

The API has three authentication paths:

1. Local email/password authentication issues short-lived HS256 access JWTs and longer-lived HS256 refresh JWTs.
2. Browser OIDC login uses `express-openid-connect`, Authorization Code callbacks, and an encrypted cookie session.
3. API clients can submit external RS256 access tokens, which are verified with the configured issuer, audience, and JWKS endpoint.

Protected routes resolve credentials in this order: OIDC session, local access cookie, local bearer token, then external bearer token. A verified external identity is linked to or provisioned as a local `User`, and authorization uses `req.user` plus `adminMiddleware`.

## Key Files and Functions

| File                            | Responsibility                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `app.js`                        | Mounts cookie parsing and optional `express-openid-connect` routes: `/login`, `/callback`, `/logout` |
| `config/env.js`                 | Local JWT, refresh JWT, cookie, issuer, audience, client, and callback-base configuration            |
| `middleware/authMiddleWare.js`  | Credential resolution, access-cookie renewal, external fallback, rate limiting, admin authorization  |
| `services/authProvider.js`      | RS256 verification using cached JWKS keys selected by `kid`                                          |
| `services/authService.js`       | Password login, JWT signing, refresh verification, and external-user provisioning                    |
| `controllers/authController.js` | Sets/clears cookies and implements register, login, refresh, logout, and profile handlers            |
| `routes/authRoutes.js`          | `/register`, `/login`, `/refresh`, `/logout`, `/profile`, and password-reset routes                  |
| `public/js/login.js`            | Submits local credentials; JavaScript does not persist the returned token                            |
| `public/js/scripts.js`          | Makes cookie-authenticated profile and logout requests                                               |

## Step-by-Step Flows

### Local login and renewal

1. The browser posts credentials to `/api/auth/login`.
2. `AuthService.login()` verifies the bcrypt password hash.
3. The service/controller are intended to create access and refresh JWTs.
4. The controller sets HTTP-only, `SameSite=Strict` cookies; production cookies are marked `Secure`.
5. `authMiddleware` verifies the access cookie and loads the user.
6. If the access cookie is expired, `tryAutoRefresh()` verifies the refresh cookie and rotates both JWTs.
7. `/api/auth/refresh` also performs explicit rotation.
8. `/api/auth/logout` clears local cookies and attempts OIDC logout when an OIDC session exists.

### OIDC browser login

1. With complete OIDC client configuration, `express-openid-connect` owns `/login`.
2. It redirects to the configured issuer and receives the Authorization Code response at `/callback`.
3. The library validates callback state and OIDC nonce, exchanges the code, validates the ID token, and establishes an encrypted cookie session.
4. `authMiddleware` reads `req.oidc.user`.
5. `provisionExternalUser()` resolves by `sub`, falls back to email, and creates or links a local user.

PKCE is not configured directly in application code. Its effective use must be verified against the pinned `express-openid-connect` version and provider configuration.

### External bearer token

1. An API client sends `Authorization: Bearer <token>`.
2. Local HS256 verification is attempted first.
3. If it fails and external authentication is enabled, `authProvider.verifyToken()` reads `kid`.
4. The matching public key is fetched from the issuer JWKS endpoint and cached.
5. `jsonwebtoken` verifies RS256, issuer, audience, and expiration.
6. The claims are used to resolve or provision the local user.

## Token, Session, Scope, and Claims Handling

| Item                  | Current behavior                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Local access token    | HS256 JWT containing `userId`; configured lifetime, currently documented as 15 minutes                    |
| Local refresh token   | HS256 JWT containing `userId` and `type: refresh`; configured lifetime, currently 7 days                  |
| External access token | RS256 JWT verified per request with issuer, audience, algorithm, expiration, and JWKS key                 |
| ID token              | Validated and retained through `express-openid-connect`; normalized claims are exposed as `req.oidc.user` |
| Browser storage       | Local JWTs use HTTP-only cookies; OIDC uses the library's encrypted cookie session                        |
| Server storage        | No refresh-token/session family or revocation records are stored server-side                              |
| OIDC scopes           | Not explicitly configured in `app.js`; middleware/provider defaults apply                                 |
| Claims consumed       | `sub`, `email`, and optionally `name`; authorization additionally uses the local database `role`          |

## Security Findings

| Severity   | Finding                                                                 | Evidence and impact                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------------------------- |
| **High**   | External identities are linked by unverified email                      | `provisionExternalUser()` links an existing account by `email` without requiring `email_verified`. A weak or malicious provider identity could claim a local account.   |
| **High**   | Login/register do not currently return a refresh token from the service | Controllers expect `result.refreshToken`, but `AuthService.login()` and `register()` return only an access token. Refresh-cookie creation is therefore incomplete.      |
| **High**   | Refresh rotation has no reuse detection or revocation                   | Old refresh JWTs remain valid until expiration because there is no server-side token family, hashed session record, version, or `jti` denylist.                         |
| **Medium** | Tokens are returned in JSON despite HTTP-only cookies                   | Login/register/refresh responses expose raw access and refresh tokens to browser JavaScript, weakening the HTTP-only boundary.                                          |
| **Medium** | Refresh token class is not enforced                                     | Refresh verification checks signature and expiration but does not require `type === "refresh"`.                                                                         |
| **Medium** | Refresh secret falls back to the access-token secret                    | `JWT_REFRESH_SECRET                                                                                                                                                     |     | JWT_SECRET` permits both token classes to share one key. |
| **Medium** | OIDC configuration can be partially enabled                             | External token verification and browser OIDC require different subsets of variables; startup does not reject incomplete combinations.                                   |
| **Medium** | PKCE is not explicit or tested                                          | Authorization Code details are delegated to the library, with no regression test proving S256 PKCE is used.                                                             |
| **Medium** | Callback origin is configuration-trusted                                | `AUTH_BASE_URL` is not validated or forced to HTTPS in production. Exact provider-side redirect registration is required.                                               |
| **Medium** | Local refresh/logout endpoints lack explicit CSRF tokens                | `SameSite=Strict` materially reduces cross-site requests, but origin checking or CSRF tokens would provide stronger protection and handle future cookie-policy changes. |
| **Low**    | OIDC scopes are implicit                                                | The application assumes `email` is returned but does not explicitly request/document scopes and required claims.                                                        |
| **Low**    | Provider/JWKS failures become generic 500 responses                     | Availability failures are not distinguished from application errors or mapped to a controlled 503.                                                                      |
| **Low**    | Password-reset delivery is incomplete                                   | A token is generated and hashed, but no email delivery path is implemented.                                                                                             |

No hardcoded production client secret was found. OIDC `state` and `nonce` validation are delegated to `express-openid-connect`; the repository does not disable them, but it also lacks callback-security integration tests.

## Recommended Fixes

1. Make `login()` and `register()` return a signed refresh token and add end-to-end cookie tests.
2. Require `email_verified === true` before email-based linking, or require an authenticated account-link confirmation. Store issuer plus subject if multiple providers may be supported.
3. Store hashed refresh-token families server-side, rotate transactionally, detect reuse, and revoke on logout and password reset.
4. Remove raw tokens from browser JSON responses. If machine clients need token responses, expose a separate, explicit contract.
5. Require a distinct `JWT_REFRESH_SECRET` and validate `type`, `iss`, `aud`, and `jti` claims.
6. Validate complete auth modes at startup and require HTTPS callback/cookie configuration in production.
7. Explicitly configure OIDC scopes and required claims.
8. Confirm and test S256 PKCE, invalid/missing state, nonce mismatch, callback replay, issuer/audience mismatch, and redirect-origin rejection.
9. Add Origin/Referer validation or CSRF tokens to cookie-authenticated state-changing endpoints.
10. Use a deployed secret manager and document access-token, refresh-token, and OIDC-client-secret rotation.

## Questions and Assumptions

- The refresh-token implementation is currently uncommitted and appears incomplete at the service/controller boundary.
- The installed OIDC middleware version/provider settings determine PKCE behavior.
- External-provider refresh tokens are not requested or handled by application code.
- The encrypted OIDC cookie is the only OIDC session store; no server-side session database is configured.
- Local authorization is role-based (`user`/`admin`) rather than OAuth scope-based.
