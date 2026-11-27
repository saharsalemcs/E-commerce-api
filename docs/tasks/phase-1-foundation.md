# Phase 1: Foundation

Goal of the phase: a running Express 5 app with one place for config, a database connection, one error shape, validation at the edge, and basic security. Plus the data design that every later phase builds on. No business features yet.

---

### P1-T01 Project setup and folder structure

**Goal:** Create the project skeleton as a modular monolith using ESM, with the app setup separated from the server start.
**Source:** Brief section 07 (modular monolith); `.claude/rules/folder-structure.md`.
**Depends on:** none.

**Scope**

- Endpoints: `GET /api/v1/health` (public) returns a small JSON body saying the service is up.
- Project: `package.json` with the module system set to ESM (`"type": "module"`), a start script and a dev script with auto-restart (`node --watch` or `nodemon`, your choice and reason), a Node engine version.
- Folders: designed by you, following the folder-structure rule: modules by business area, a shared folder, `app` separate from `server`, scripts outside `src`.
- Git: `.gitignore` covers `node_modules` and every `.env*` file except `.env.example`.
- Postman: a collection and an environment with a `baseUrl` variable; the health request is saved.

**Not in this task:** linting, config loading, database, error handling.

**Acceptance criteria (verify in Postman)**

- `GET {{baseUrl}}/api/v1/health` -> `200` with JSON.
- An unknown path still returns something (Express default is fine for now; P1-T05 replaces it).
- `git status` shows no `.env` or `node_modules`.
- You can explain, for each top-level folder, what belongs there and where a new "shipping" module would go.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P1-T02 Linting and formatting

**Goal:** Add ESLint and Prettier so the codebase has one style and common mistakes are caught early.
**Source:** Code conventions ("Lint and format with ESLint and Prettier").
**Depends on:** P1-T01.

**Scope**

- ESLint using its current flat config format, set up for ESM (`sourceType: "module"`) and Node globals. The config file itself must use the same module system as the project.
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

**Goal:** Design the data model for the whole MVP before you write any model, and record the main modeling decisions so that Phases 2 to 7 build on one agreed design.
**Source:** Brief section 06 (entities, relationships, invariants); brief section 10 week 1 ("finalize SKUs, product variants, inventory, user roles"); brief section 09 scenarios 01 and 02; EC-02, EC-05, EC-07, EC-08, EC-12.
**Depends on:** none (do it before Phase 2 code).

**Scope**

- Deliverables, both under `docs/design/`:
  - An ERD (any tool: draw.io, Excalidraw, Mermaid). If the tool saves a binary or external file, also commit an exported image so it can be read on GitHub.
  - A short text file (for example `docs/design/data-model.md`) that explains the diagram: one paragraph per entity plus the decisions below.
- Entities to include (MVP only):
  - **User** (roles, active flag, password-changed timestamp, password-reset fields), **Address**.
  - **Category**, **Product**, **Variant** (SKU, size, color, price, stock).
  - **Inventory adjustment** record (change, reason, before/after stock, actor). Decide whether it is its own collection or only an AuditLog entry.
  - **ShippingZone** (governorates, fee).
  - **Cart** (one per customer) with its items.
  - **Coupon** (type, value, cap, minimum subtotal, expiry, usage limit, usage count).
  - **Order** with items, address snapshot, shipping fee, coupon and discount, totals, `paymentMethod`, `paymentStatus`, order status, shipment fields, `statusHistory`, and a human-readable unique order reference.
  - **AuditLog**.
  - **ReturnRequest** (stretch, Phase 7, but model it now so the Order does not need redesigning later).
- For each entity: **key fields only** (not every field), type, required / unique / default, indexes, and every relationship labeled with its cardinality (1-1, 1-many) and with **reference** or **embedded**. For every array, write whether it is bounded or can grow without limit.
- Decide and record in `docs/02-decisions.md`, each with your reasons:
  - **Variant modeling:** embedded in Product or a separate collection. Give at least two trade-offs, considering: an atomic stock update on one SKU, finding a variant by SKU, how a unique SKU / unique size+color is enforced, document size, and showing a price range on the product listing.
  - **Address storage:** embedded in User or a separate collection. Consider the maximum number of addresses, the default address, and how the Order keeps the address it was delivered to.
  - **Role storage:** a single role field or something else. Consider the four roles, the "at least one active admin" rule, and how a role change reaches an already-issued token.
- Mark on the diagram (or in the text file) which Order and order-item fields are **snapshots**, and explain for each one what would go wrong without it (price changes, product renamed, address edited, coupon deleted).
- List the invariants and say where each one is enforced: schema, index, atomic query, or service code. At least:
  - SKU is unique; size+color is unique within one product.
  - Stock is never negative.
  - Money fields are integer piasters; totals are never negative.
  - A cart belongs to exactly one customer; an order belongs to exactly one customer.
  - The order reference is unique.
  - Coupon code is unique; usage count never goes above the usage limit.
  - User email is unique (stored lowercase).
- Show what the brief lists that you are **not** modeling, and why: StockReservation and PaymentAttempt (deferred), a separate Shipment entity (decided: fields live inside the Order), ProductImage (decided: array of URL strings), ChatConversation (out). The brief's "reserved stock" is not used while stock is deducted at order creation.

**Not in this task:** any code or Mongoose schema; the order and payment status transitions (P1-T09); Phase 8 extras (Brands, Subcategories, Reviews, Wishlist), which are designed in their own tasks.

**Acceptance criteria (verify by walking through the diagram with the mentor)**

- Every entity listed above is in the diagram, with fields, indexes, and labeled relationships.
- The three decisions (variant, address, role) and the inventory-adjustment decision are in `docs/02-decisions.md` with reasons, and are removed from its "Open" list.
- **Brief scenario 01:** you can show, on your model, how "a product has two variants, a customer buys one, only that variant's stock changes" works, and which single update changes the stock.
- **Brief scenario 02:** you can show which stored fields let anyone check later that the order total equals the quote (subtotal, discount, shipping, total), even after prices change.
- You can answer: "the catalog manager changes a variant's price after an order was placed. What changes in the database, and what does the customer see in their order history?"
- You can answer: "a customer edits or deletes an address used by an old order. What happens to that order?"
- You can name which of your arrays can grow without limit and why that is acceptable or not.

**Concepts to review:** MongoDB data modeling: embedding vs referencing, the unbounded-arrays antipattern and the 16 MiB document limit (MongoDB Manual, "Data Modeling", "Embedded Data", and "Avoid Unbounded Arrays"); how a unique index behaves on fields inside an embedded array compared with a separate collection (MongoDB Manual, "Unique Indexes"); denormalization and snapshots; single-document atomicity; cardinality and ERD notation.

**Definition of done:** the diagram and the text file are committed under `docs/design/`, the decisions are in `docs/02-decisions.md`, you can answer every question in the acceptance criteria, and `/review-task` has returned "Ready".

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
