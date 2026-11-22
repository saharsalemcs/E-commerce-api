# Phase 1: Foundation

Goal of the phase: a running Express 5 app with one place for config, a database connection, one error shape, validation at the edge, and basic security. Plus the data design that every later phase builds on. No business features yet.

---

### P1-T01 Project setup and folder structure

**Goal:** Create the project skeleton as a modular monolith using ESM, with the app setup separated from the server start.
**Source:** Brief section 07 (modular monolith); `.claude/rules/folder-structure.md`.
**Depends on:** none.

**Scope**
- Endpoints: `GET /api/v1/health` (public) returns a small JSON body saying the service is up.
- Project: `package.json` with ESM enabled, a start script and a dev script with auto-restart (`node --watch` or `nodemon`, your choice and reason), a Node engine version.
- Folders: designed by you, following the folder-structure rule: modules by business area, a shared folder, `app` separate from `server`, scripts outside `src`.
- Git: `.gitignore` covers `node_modules` and every `.env*` file except `.env.example`.
- Postman: a collection and an environment with a `baseUrl` variable; the health request is saved.

**Not in this task:** linting, config loading, database, error handling.

**Acceptance criteria (verify in Postman)**
- `GET {{baseUrl}}/api/v1/health` -> `200` with JSON.
- An unknown path still returns something (Express default is fine for now; P1-T05 replaces it).
- `git status` shows no `.env` or `node_modules`.
- You can explain, for each top-level folder, what belongs there and where a new "shipping" module would go.

**Concepts to review:** ESM vs CommonJS in Node (`"type": "module"`, file extensions in imports, no `__dirname` by default); why `app` and `server` are split; modular monolith vs layered-by-type folders.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P1-T02 Linting and formatting

**Goal:** Add ESLint and Prettier so the codebase has one style and common mistakes are caught early.
**Source:** Code conventions ("Lint and format with ESLint and Prettier").
**Depends on:** P1-T01.

**Scope**
- ESLint using its current flat config format, set up for ESM and Node globals.
- Prettier with a small config; ESLint and Prettier must not fight each other.
- Scripts: `lint`, `lint:fix` (or similar), `format`.
- Editor: format on save works in VS Code.

**Not in this task:** pre-commit hooks (optional, only if you want them).

**Acceptance criteria**
- `npm run lint` passes on the current code.
- Introduce an unused variable on purpose -> lint reports it. Remove it.
- Mis-format a file on purpose -> format script fixes it.

**Concepts to review:** ESLint flat config (`eslint.config.js`); why formatting rules belong to Prettier and correctness rules to ESLint.

**Definition of done:** all acceptance criteria pass, and `/review-task` has returned "Ready".

---

### P1-T03 Configuration module

**Goal:** One module reads, validates, and exports all configuration. Nothing else reads `process.env`.
**Source:** Code conventions (secrets in env only); folder-structure rule (config in one place).
**Depends on:** P1-T01.

**Scope**
- Data: at least `NODE_ENV`, `PORT`, `MONGODB_URI`. Add more keys later as tasks need them (JWT, Resend, admin seed).
- Loading: `dotenv` or Node's built-in `--env-file`. Pick one and say why.
- Validation: the environment is validated with Zod at startup. Missing or malformed values stop the app with a clear message that names the key (never prints secret values).
- Output: a frozen, typed-looking config object with sensible names (for example `config.db.uri`), not raw env names everywhere.
- `.env.example` lists every key with a placeholder value.

**Not in this task:** using the DB URI (next task).

**Acceptance criteria**
- Remove `PORT` (or set it to `abc`) -> the app refuses to start and names the problem.
- With valid values the app starts and `/health` still works.
- A project-wide search for `process.env` finds it only in the config module.

**Concepts to review:** fail-fast configuration; Zod schemas, `coerce`, and defaults; 12-factor config.

**Definition of done:** all acceptance criteria pass, and `/review-task` has returned "Ready".

---

### P1-T04 Database connection (Atlas)

**Goal:** Connect to MongoDB Atlas with Mongoose before the server starts listening, and shut down cleanly.
**Source:** Brief section 07; decision "MongoDB Atlas".
**Depends on:** P1-T03.

**Scope**
- Atlas: a free cluster, a database user with least privilege, network access set for your machine. The connection string lives only in `.env`.
- Startup order: connect first, then listen. If the connection fails, log a clear message and exit with a non-zero code.
- Shutdown: on `SIGINT`/`SIGTERM`, stop accepting requests, close the DB connection, exit.
- Unhandled rejections and uncaught exceptions: decide what the process does and log it.
- Health: `/health` may report the DB connection state (optional, your choice).

**Not in this task:** any model.

**Acceptance criteria**
- Valid URI -> logs "connected" and the server listens.
- Wrong password in the URI -> process exits with a readable error, no stack spam with credentials in it.
- Ctrl+C -> logs a clean shutdown.

**Concepts to review:** Mongoose `connect` and connection events (Mongoose 9 docs); why Atlas gives you a replica set and why transactions need one; graceful shutdown.

**Definition of done:** all acceptance criteria pass, and `/review-task` has returned "Ready".

---

### P1-T05 Error handling and response shape

**Goal:** One operational error class, one centralized error middleware, a 404 handler, and one documented response shape for success and error.
**Source:** Brief section 07 ("consistent error messages"); Repo extra: centralized error handling; code conventions (Errors).
**Depends on:** P1-T01.

**Scope**
- Decide and **write down in `docs/02-decisions.md`** the success shape and the error shape (for example: status, message, optional details for validation errors, optional pagination meta). This closes the open decision "API response and error shape".
- An operational error class carrying an HTTP status and a client-safe message.
- Central error middleware: operational errors -> their status and message; unknown errors -> `500` with a generic message; in development you may include the stack, never in production.
- Translate common Mongoose/MongoDB errors into operational ones: invalid ObjectId cast, schema validation error, duplicate key (`11000`) -> `409`.
- Unknown routes -> `404` in the error shape.
- Malformed JSON body -> `400` in the error shape (not an HTML page).

**Not in this task:** Zod validation errors (next task), auth errors.

**Acceptance criteria (verify in Postman)**
- `GET /api/v1/nope` -> `404`, error shape.
- `POST` to any route with broken JSON -> `400`, error shape.
- A temporary test route that throws inside an `async` handler -> `500`, generic message, no stack when `NODE_ENV=production`. Remove the route afterwards.
- No route handler contains a try/catch just to forward errors.

**Concepts to review:** Express 5 error handling (expressjs.com 5.x guide: rejected promises from async handlers call `next(err)` automatically); operational vs programmer errors; error middleware signature (4 arguments).

**Definition of done:** all acceptance criteria pass in Postman, and `/review-task` has returned "Ready".

---

### P1-T06 Request validation with Zod

**Goal:** A reusable way to validate `body`, `params`, and `query` with Zod before any business logic, with errors in the shape from P1-T05.
**Source:** Brief section 07 ("DTO validation"); brief section 08 ("clear validation messages"); code conventions (Validation).
**Depends on:** P1-T05.

**Scope**
- A validation middleware (or helper) that takes Zod schemas for any of body / params / query.
- On failure: `400`, with a list of field paths and messages a client could show next to a form field.
- On success: handlers receive the **parsed** values (coerced, defaults applied, unknown keys handled by a rule you choose: strip or reject).
- A shared schema for a MongoDB ObjectId route param.
- Express 5 detail: `req.query` is a read-only getter and `req.body` is `undefined` when no body was parsed. Your design must work with both.

**Not in this task:** schemas for real features (each feature task writes its own).

**Acceptance criteria (verify in Postman)**
- A temporary test route with a body schema: missing field -> `400` naming the field; wrong type -> `400`; valid -> `200` with the parsed value echoed. Remove the route afterwards (or keep it only in development).
- A route with an `:id` param: `abc` -> `400`, not a `500` cast error.

**Concepts to review:** Zod `safeParse`, error issues and paths, `coerce`, `strict` vs `strip`; Express 5 migration notes on `req.query` and `req.body`.

**Definition of done:** all acceptance criteria pass in Postman, invalid input is rejected, and `/review-task` has returned "Ready".

---

### P1-T07 Security and logging middleware

**Goal:** Add the baseline HTTP security headers, CORS policy, body size limit, and request logging.
**Source:** Brief section 09 (operational basics); code conventions (Security basics).
**Depends on:** P1-T03, P1-T05.

**Scope**
- `helmet` with defaults (understand what the main headers do).
- `cors` with an allow-list from config, not `*` in production.
- JSON body size limit.
- Request logging with `morgan` in development (choose a format for production or turn it off; explain).
- Decide whether to trust a proxy (`trust proxy`) and note why it matters for rate limiting later.

**Not in this task:** rate limiting (P2-T08, on auth routes).

**Acceptance criteria (verify in Postman)**
- Response headers on `/health` show helmet's headers (for example `X-Content-Type-Options`).
- A body larger than your limit -> `413` in the error shape.
- Requests are logged in development.

**Concepts to review:** what CORS protects and what it does not; security headers; why body limits matter.

**Definition of done:** all acceptance criteria pass in Postman, and `/review-task` has returned "Ready".

---

### P1-T08 Data design: ERD

**Goal:** Design the data model for the whole MVP before writing models, and record the main modeling decisions.
**Source:** Brief section 06 (entities and invariants); brief section 10 week 1 ("finalize SKUs, product variants, inventory, user roles").
**Depends on:** none (do it before Phase 2 code).

**Scope**
- A diagram (any tool: draw.io, Excalidraw, Mermaid) saved under `docs/design/`, plus a short text file explaining it.
- Entities: User (with roles), Address, AuditLog, Category, Product, Variant (SKU), ShippingZone, Cart, Coupon, Order (with items, address snapshot, shipment fields, statusHistory), ReturnRequest.
- For each: key fields, types, required/unique, indexes, and relationships (reference vs embedded).
- Decide and record in `docs/02-decisions.md`:
  - **Variant modeling:** embedded in Product or separate collection. Give at least two trade-offs (atomic stock updates on one SKU, querying by SKU, document size, listing price range).
  - **Address storage:** embedded in User or separate collection.
  - **Role storage:** single field or other.
- Mark which fields are **snapshots** on the Order and why.
- Mark which invariants live in the schema/indexes (for example unique SKU, stock never negative).

**Not in this task:** any code.

**Acceptance criteria**
- Every MVP entity is in the diagram with its relationships.
- The three decisions above are written in `docs/02-decisions.md` with reasons.
- You can explain how "two variants of one product, buy one, only its stock changes" (brief scenario 01) maps to your model.

**Concepts to review:** MongoDB data modeling (embed vs reference, bounded vs unbounded arrays); denormalization and snapshots; schema-level invariants.

**Definition of done:** the diagram and decisions exist, and `/review-task` has returned "Ready".

---

### P1-T09 Data design: order and payment state diagrams

**Goal:** Draw the order status and payment status state machines, including who can trigger each transition.
**Source:** EC-12; brief section 10 week 1 ("order/payment state diagrams"); decisions "Order flow".
**Depends on:** P1-T08.

**Scope**
- Order statuses: `pending`, `accepted`, `packing`, `shipped`, `delivered`, `cancelled`.
- Payment statuses for COD: at least `pending` and `paid` (decide if you need more, for example what payment status a cancelled COD order has).
- For each transition: allowed from-state, to-state, which roles may trigger it, side effects (stock restored, coupon usage released, statusHistory entry, audit entry, timestamps such as `shippedAt`/`deliveredAt`).
- Rules from the decisions: customer cancels only from `pending` or `accepted`; staff cancels from `pending`, `accepted`, `packing`; no cancel after `shipped`; COD becomes `paid` at `delivered` by order operator or admin; anything else is rejected.
- A human-readable label for each status (brief section 08).
- Saved under `docs/design/`.

**Not in this task:** any code.

**Acceptance criteria**
- Every allowed transition is drawn; everything not drawn is forbidden.
- You can answer: "two operators press 'ship' on the same order at the same time, what must happen?"

**Concepts to review:** finite state machines; transition tables; why state lives on the server, not the client.

**Definition of done:** the diagrams exist, and `/review-task` has returned "Ready".
