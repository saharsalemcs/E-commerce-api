# Learning log

One entry per task that reached "Ready" in `/review-task`: date, task ID, the most important feedback, concepts learned.

<!-- entries are appended below -->

## 2026-11-22: P1-T01 Project setup and folder structure
- **Feedback:** `app.js` is separate from `server.js`; `.gitignore` uses `.env*` with `!.env.example`; empty folders are not tracked by Git; module system changed from ESM to CommonJS and recorded in `docs/02-decisions.md`.
- **Concepts:** CommonJS vs ESM, why `app` and `server` are split, modular monolith vs layered-by-type folders, `engines` in `package.json`.

## 2026-11-22: P1-T02 Linting and formatting
- **Feedback:** the ESLint config must use the same module system as the project (CommonJS, not `import`); Prettier needs a small config and a `.prettierignore` so `format` does not touch docs and lockfiles; `endOfLine: auto` avoids CRLF warnings on Windows.
- **Concepts:** ESLint flat config, `sourceType: "commonjs"`, formatting rules (Prettier) vs correctness rules (ESLint), `eslint-config-prettier`.

## 2026-11-22: P1-T03 Configuration module
- **Feedback:** all env access lives in `src/config/index.js`; Zod validation at startup prints key names and never values; no defaults on purpose (fail fast); `Object.freeze` is shallow; `process.exit` inside a module is a trade-off against `throw`; morgan enabled only when `config.env` is `development`, and it is a runtime dependency.
- **Concepts:** fail-fast configuration, 12-factor config, `z.coerce`, `process.env` values are always strings, middleware order in Express.

## 2026-11-26: P1-T04 Database connection (Atlas)
- **Feedback:** connect to Atlas before the server starts listening; graceful shutdown closes the HTTP server and the Mongoose connection; the module system was switched back to ESM during this review and recorded in `docs/02-decisions.md`, so relative imports now include the file extension. MongoDB Atlas is a replica set, so transactions are available for order creation later.
- **Concepts:** Mongoose `connect` and connection events, replica sets and why transactions need one, graceful shutdown (`SIGINT` / `SIGTERM`), ESM import rules.

## 2026-11-26: P1-T05 Error handling and response shape
- **Feedback:** one `AppError(message, statusCode, details?)` for expected errors and one centralized error middleware plus a `notFound` handler; the response shape is `{ success, data, meta? }` for success and `{ success: false, message, details? }` for errors, with `stack` only in development; Mongoose `CastError` and `ValidationError` map to `400`, duplicate key `11000` to `409`, malformed JSON to `400`, and anything unknown becomes a generic `500` that never leaks internals. Recorded in `docs/02-decisions.md`.
- **Concepts:** Express 5 forwards rejected promises from async handlers to the error middleware (no wrapper library), operational vs programmer errors, the 4-argument error middleware signature, not leaking stack traces.

## 2026-11-27: P1-T06 Request validation with Zod
- **Feedback:** a validate middleware checks `body`, `params` and `query` before any business logic and stores the parsed values in `req.validated`, because in Express 5 `req.query` is a read-only getter; `body` schemas use `strict()` so unknown keys such as `role` are rejected, `query` uses `strip()`; error `details` are `{ field, message }` with the source as a prefix (for example `body.items.0.qty`). Recorded in `docs/02-decisions.md`.
- **Concepts:** Zod `safeParse` and issue paths, `coerce`, `strict` vs `strip`, mass assignment, Express 5 changes to `req.query`.

## 2026-11-27: P1-T07 Security and logging middleware
- **Feedback:** `helmet` with defaults, `cors` driven by an allow-list from config, a JSON body size limit from config, `morgan` for request logging, and a `TRUST_PROXY` setting in the config schema (it matters for rate limiting later because the client IP depends on it).
- **Concepts:** what CORS protects and what it does not, main security headers, why body limits matter, `trust proxy` and client IP.

## 2026-11-27: P1-T08 Data design: ERD
- **Feedback:** variants as their own collection (one document per SKU) so unique SKU and unique `{ productId, size, color }` are real database guarantees, and stock is one atomic conditional update on one small document; the `min: 0` schema rule does not protect stock because Mongoose update validators do not run on `$inc`, so the conditional filter is the real guarantee; the Order keeps snapshots (price, title, SKU, address, shipping fee, coupon) and no reference to the shipping zone; manual stock adjustments and order-driven stock changes are audited under separate actions; a unique index on an embedded array only works across documents, and size+color per product cannot be expressed that way at all.
- **Concepts:** embed vs reference, bounded vs unbounded arrays, unique multikey indexes, single-document atomicity, snapshots and denormalization, schema-level vs service-level invariants, Mongoose `immutable`.

## 2026-11-27: P1-T09 Data design: order and payment state diagrams
- **How it was done:** state machines were new, so the design was built with the mentor and then reviewed. Result: `docs/design/order-state-machine.md` (two Mermaid diagrams, transition tables, labels, concurrency). P5-T01, P5-T05, P6-T02, P6-T03 and P6-T04 implement pieces of it; re-read it before each of them.
- **Feedback:** a state machine is a whitelist of allowed moves (from, to, who, guard, side effects); everything else is `409`. The server owns the state: clients request actions, never "set status to X". `status` (logistics) and `paymentStatus` (money) are two machines linked by guards. Payment values are `pending`, `paid`, `voided`: a cancelled COD order is `voided` so reports do not count it as cash to collect; no `refunded`, because a paid order can never be cancelled and refunds after a return live in `ReturnRequest.refundStatus`. Mark paid is a separate action (P6-T03), so "delivered but not paid yet" is visible. Two operators pressing "ship" at once is a check-then-act race; the fix is one conditional update with the expected status in the filter.
- **Fixed in review:** the cancel filter uses `status: { $in: [...] }` for the actor's allowed states plus `userId` for a customer; a conditional update that matches nothing does not abort a transaction, so the service must throw; two concurrent cancels in transactions hit a write conflict, the retry no longer matches, `409`; mark-paid guard includes `paymentMethod = cod`; audit actions include `order.payment_status_changed`; order of checks `401 -> 403 -> 400 -> 404 -> 409`, ownership before state.
- **Accepted gap:** a refused COD parcel has no path after `shipped` (`delivery_failed` is post-MVP).
- **Concepts:** finite state machines, transition tables (whitelist), guards, final states, check-then-act race conditions, conditional atomic updates, transaction abort and `TransientTransactionError` retry, server-owned state.

## 2026-11-28: P2-T01 User model
- **How it was recorded:** added after P2-T02 because it was missed; rebuilt from the code, the commits and the recorded decisions, not from the review notes.
- **Feedback:** `email` is unique, trimmed and lowercased, so the same address in a different case is a duplicate (`409`); `passwordHash` uses `select: false` and is also removed in the `toJSON` transform, because `select: false` does not apply to the document returned by `create`; hashing lives in `src/common/utils/password.js` and is called by services, not by a model hook, since `save` hooks do not run on query updates; `bcryptjs` with the cost factor from `BCRYPT_ROUNDS`; roles and the Egyptian phone regex are shared constants; the `{ role, isActive }` index is there for P2-T05. Recorded in `docs/decisions/phase-2.md`.
- **Concepts:** password hashing, salt and cost factor, Mongoose `select: false` and `toJSON` transforms, pre-save hooks vs service-level logic, unique indexes vs validation.

## 2026-11-28: P2-T02 Register
- **How it was done:** the mentor wrote the validation schema, the router wiring, the response helpers and the decision records on request, and fixed the service parameters and the response shape; the learner wrote the first version of the service, controller, route, token helper and JWT config, restored the token in the response and verified the acceptance criteria in Postman.
- **Feedback:** ESM relative imports need the file extension, and a clean lint run does not prove the imports resolve; one object argument does not spread into positional parameters, so destructure by name; the response must match the recorded decision (`data: { user, token }`); success and error bodies are built in one place (`sendSuccess`, `sendError`), while errors are still thrown as `AppError`; module routers are mounted in `src/routes.js` under `/api/v1`; the client never chooses its role (`strictObject` plus the service setting `customer`); a Postman script should save the token only on `201`. Recorded in `docs/decisions/phase-2.md`.
- **Open (not blocking):** `JWT_SECRET` accepts an empty string, so a misconfigured environment would create the user and then fail to sign the token.
- **Concepts:** JWT claims, signing and expiry, Bearer header vs cookie (XSS, CSRF), mass assignment, object destructuring in parameters, the bcrypt 72-byte limit, Zod `refine` with `path` and `when`, Express Router, partial failure.
