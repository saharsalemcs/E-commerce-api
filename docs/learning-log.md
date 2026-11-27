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
