# Gradual TypeScript migration plan

## Goal and approach

Migrate the Express, Sequelize, EJS, and browser JavaScript application in small,
reviewable PRs. Keep JavaScript and TypeScript working together and leave the
application deployable after every step. Preserve the existing architecture,
CommonJS module system, endpoint paths, response formats, and database schema.

## Steps

1. **Establish a baseline.** Run the backend and frontend Jest configurations
   explicitly. Record existing failures and verify startup against a disposable
   database. Preserve existing working changes.
   - Done when test commands are repeatable and existing issues are documented.

2. **Add TypeScript infrastructure.** Add TypeScript and compatible type
   definitions. Configure backend compilation with `allowJs: true`,
   `checkJs: false`, `strict: true`, and output to `dist/`. Exclude browser code,
   tests, dependencies, and generated output. Preserve the source directory
   structure and CommonJS runtime compatibility.
   - Done when the existing backend JavaScript builds and runs from `dist/`.

3. **Make builds deployable.** Add build and type-check scripts. Update Docker to
   compile with development dependencies and run compiled code with production
   dependencies. Preserve access to `views/` and `public/`. Update Swagger
   scanning for compiled paths and ensure annotations survive compilation.
   - Done when the container serves API routes, EJS pages, static files, and API
     documentation.

4. **Convert one small module.** Choose a low-dependency module after inspecting
   its imports. Convert it to `.ts`, preserving its CommonJS export shape.
   Configure Jest to support mixed JavaScript and TypeScript source files.
   - Done when existing JavaScript callers and tests work and the converted
     module passes strict checking.

5. **Type the database boundary.** Convert Sequelize models incrementally.
   Define attributes, creation inputs, associations, and a typed model registry.
   Make model initialization consistent in a separate change where necessary.
   - Done when model tests pass and consumers receive meaningful model types.

6. **Migrate the product feature.** Convert the product controller and routes.
   Type request parameters, inputs, responses, and `req.models`.
   - Done when product CRUD and search tests pass with unchanged API behavior.

7. **Migrate authentication.** Convert the authentication controller and
   middleware. Type `req.user`, narrow JWT payloads, validate required environment
   values, and handle caught errors safely.
   - Done when login, profile, invalid-token, and expired-token behavior is
     verified.

8. **Migrate orders and payments.** Convert orders first, then checkout and
   payment code. Separate API input types from persisted attributes and use
   Stripe's types.
   - Done when order tests and payment success/failure tests pass without live
     charges.

9. **Finish backend startup and observability.** Convert database configuration,
   metrics, tracing, Swagger, and `server.js`. Preserve tracing initialization
   order. Consider separating app creation from startup in its own PR.
   - Done when the compiled application starts and telemetry and metrics smoke
     checks pass.

10. **Migrate browser code separately.** Use a browser-specific TypeScript
    configuration with DOM types. Compile assets to the existing `/js/*.js` URLs
    and preserve globals used by EJS. Convert login, then cart, then the larger
    scripts module. Keep browser output separate from backend compilation.
    - Done when frontend Jest tests and browser checks pass and templates work.

11. **Complete enforcement.** Convert remaining tests and scripts where useful.
    Disable `allowJs` for fully migrated application scopes. Enforce type-checks,
    tests, and builds in CI.
    - Done when all application TypeScript passes strict checks without broad
      escape hatches.

## Existing issues to resolve explicitly

These observations are based on source inspection, not executed tests. Track
behavior fixes separately so type conversion does not silently change contracts.

- `controllers/orderController.js` writes `totalPrice`, while `models/order.js`
  defines `total`.
- `models/index.js` exports model factories; `server.js` initializes models
  separately.
- Product search references `Op` without an import.
- `swagger.js` requires Swagger packages absent from `package.json`.
- Startup runs `sequelize.sync({ alter: true })`; verification must use a
  disposable database.

## Rules for every migration PR

- Convert one module or feature at a time.
- Keep API behavior and database schema stable; handle intentional fixes in
  separate, tested changes.
- Validate external inputs at runtime. TypeScript alone does not validate JSON,
  JWTs, environment variables, or third-party responses.
- Avoid blanket `any`, `@ts-ignore`, and unrelated dependency upgrades.
- Require type-checking, relevant tests, and a build before merging.
- Keep each PR independently revertible and exclude unrelated working changes.

## First delivery

Complete step 1, then deliver steps 2 and 3 as a tooling PR before converting
application code. This establishes the mixed-language build and deployment path
before the first application module changes.
