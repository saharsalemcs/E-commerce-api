# Decisions

## Decided by the learner
- **Stack:** Node.js, Express 5, MongoDB + Mongoose, Zod, JavaScript (no TypeScript for now).
- **Versions:** latest stable of every package unless there is a known problem.
- **Email:** Resend (instead of Nodemailer).
- **API testing and docs:** Postman for now. Swagger/OpenAPI and automated tests come after the MVP.
- **Scope:** MVP is what the learner has studied plus what is easy to pick up. Webhooks, payments, file upload, testing, and Swagger are deferred.
- **AI tooling:** Claude Code on a Claude Pro plan (instead of Cursor).
- **AI role:** mentor, not code writer. Code is written only on explicit request.
- **Docs rule:** the mentor checks the latest official docs (Context7 MCP first) before writing or reviewing code, and may search the web for how people apply things when opinions differ.

- **Module system:** ESM (`"type": "module"`). Decided by the learner during P1-T01 (2026-11-22) as CommonJS, then changed back to ESM during the P1-T04 review (2026-11-26). Use `import` and `export` consistently across the whole project; do not mix with `require`/`module.exports`. Relative imports must include the file extension (for example `./config/index.js`), and `eslint.config.js` uses ESM too.
- **Env loading:** `dotenv`, chosen by the learner in P1-T03 (reason to be added by the learner). Config lives in `src/config/index.js`; it validates with Zod at startup and exits with a message that names the key and never prints values.
- **Response shape (P1-T05):** success `{ "success": true, "data": ... }` plus optional `"meta"` for pagination; error `{ "success": false, "message": "...", "details": [...]? }`. `details` is only for validation errors (`[{ "field", "message" }]`). A `stack` field appears only when `NODE_ENV=development`. One error class `AppError(message, statusCode, details?)` in `src/common/errors/`; `notFound` and `errorHandler` in `src/common/middlewares/`. Mongoose `CastError` and `ValidationError` map to 400, duplicate key (`11000`) to 409, malformed JSON to 400, anything unknown to a generic 500.
- **MongoDB hosting:** MongoDB Atlas (replica set, so transactions are available).
- **Unknown keys in validation (P1-T06):** **Decision:** `body` schemas use `strict()` (reject unknown keys). `query` uses `strip()`.
*Why:*
- A typo like `emial` instead of `email` fails loudly with a `400` instead of being silently ignored.
- Blocks mass-assignment attempts (for example `role: "admin"` on register). The request is rejected and the attempt is visible, not hidden.
- Easier to debug: the client always knows exactly which field was not accepted.
- Query uses `strip()` because clients and tools often add harmless extra params (tracking, cache busters), and rejecting them adds friction without security value.

**Where parsed values live:** `req.validated`
 The validate middleware stores parsed values in `req.validated = { body, params, query }`. Controllers read from `req.validated`, never from raw `req.body/params/query`.
*Why:*
- In Express 5, `req.query` is a read-only getter, so it cannot be overwritten with the parsed result.
- One consistent place for all three sources instead of overwriting some and not others.
- Parsed values include coercion (`"2"` becomes `2`) and defaults, so handlers get clean typed data.
- `req.body` can be `undefined` when no body was parsed. It is passed to the schema as is, so a missing required body fails as a normal `400`.

**Validation error `field` format**
 Each item in `details` is `{ field, message }`, where `field` is `<source>.<path>`, for example `body.email` or `body.items.0.qty`. Nested paths are joined with `.`; array indexes are numbers in the path. If the path is empty, `field` is just the source (for example `body`).
*Why:*
- The same name can exist in body and query, so the source prefix removes ambiguity.
- A frontend can split on `.` to place the message under the right form field.
- Matches the `details` shape already used for Mongoose validation errors in P1-T05.

## Confirmed in the Understand step (2026-11-22)
- Cash on Delivery only. The Order has `paymentMethod` and `paymentStatus` fields (default status for COD is pending) so a gateway can be added later without redesigning the Order.
- Product `images` is an array of URL strings until file upload is learned.
- Stock is deducted atomically when the order is created. No `StockReservation` with expiry and no scheduled job while there is no online payment.
- Guest carts are deferred (logged-in carts only). Tax is not implemented. Basic returns are a stretch item in the last phase. Docker is out.

### Order flow
- An order is created as `pending`. An order operator or admin moves it `pending -> accepted -> packing -> shipped -> delivered`. Any other transition is rejected.
- A customer may cancel their own order only while it is `pending` or `accepted`. Staff may cancel until before `shipped`. After `shipped` there is no cancellation (returns instead).
- Cancellation restores the stock and the coupon usage in the same transaction.
- COD `paymentStatus` becomes `paid` at `delivered`, set by an order operator or admin. Refined in P1-T09: a separate mark-paid action, see "Order and payment state machines".

### Shipping
- Shipping zones by governorate: a `ShippingZone` holds a list of governorates and a fee. Admin has CRUD on zones.
- No separate Shipment entity. Shipment fields and a `statusHistory` live inside the Order.

### Staff and roles
- Register always creates a customer. Admin creates staff accounts and changes roles.
- The first admin is created by a seed script that reads its credentials from the environment (through the config module).

### Audit log
- Built as a small task at the end of Phase 2. Every later task that changes prices, stock, coupons, or orders writes to it.

### Inventory
- Catalog managers have an inventory-adjustment endpoint that requires a reason. Every adjustment is written to the audit log.

### Coupons
- Rules: expiry, global usage limit, minimum subtotal, maximum cap for percent coupons. The discount applies to the subtotal only (not shipping).
- Usage is counted at order creation and released when the order is cancelled.
- Per-user usage limit: deferred.

### Quote and order
- No stored quote. Order creation recomputes everything from scratch using the same pricing service as the quote endpoint.
- The client may send an `expectedTotal`. The server rejects the order if the recomputed total differs.

### Concurrency check
- A script in `scripts/` fires concurrent requests (for example with `Promise.all`) to verify the "last unit" race. This is a manual verification aid, not an automated test suite.

### Task size
- One focused session is 1 to 1.5 hours. A task that does not fit in one session is split.

### Optional extras
- Written as an optional final phase, one task each: Brands, Subcategories, Reviews and ratings, Wishlist.

## Confirmed after task generation (2026-11-22)

### API conventions
- Base path `/api/v1`; staff-only routes under `/api/v1/admin/...`.
- Role names: `admin`, `catalog_manager`, `order_operator`, `customer`. "Staff" means the first three.
- Status codes: `400` invalid input; **`401` no token** (or an invalid/expired one); **`403` wrong role**; **`404` someone else's resource** (and real not-found), so the existence of another user's resource is never revealed; `409` conflict (duplicate, wrong state, not enough stock). Every protected task lists these cases explicitly in its acceptance criteria.
- Pagination convention is set in P2-T05 and used by every list endpoint.
- Customer order routes live under `/api/v1/users/me/orders` (including cancel and return requests).

### Permissions
- Admin only: coupons, shipping zones, sales reports, audit log, staff management.
- Admin and catalog manager: categories, products, variants, inventory adjustments, low-stock report.
- The catalog manager sets and changes variant prices; every price change writes an audit entry.
- Admin and order operator: order queue, status transitions, COD payment confirmation, staff cancellation, return requests.
- Customer only: cart, checkout quote, placing orders, own orders, return requests, reviews, wishlist. Staff calling these get `403`.
- An admin cannot demote or deactivate themselves; at least one active admin always exists.

### Stock
- Stock changes only through inventory adjustments or orders (create and cancel). Variant endpoints reject `stock` in the body.
- New variants are created with stock `0`. The first stock comes from an inventory adjustment with reason `initial_stock`, which is a positive change allowed only when the variant has no previous adjustment. The seed script uses the same path.

### Design and task order
- Data design tasks come first: P1-T08 (ERD, closes variant modeling, address storage, role storage) and P1-T09 (order and payment state diagrams).
- P5-T01 places orders without stock deduction on purpose; P5-T02 adds the transaction. Overselling is possible only between those two tasks.
- Returns: a return window from config after `deliveredAt`; no automatic restock (staff use an inventory adjustment).
- Phase 8 (optional extras) starts only after Phase 6 is "Ready".
- Items marked "choose and document" in the task files are decided by the learner during `/plan-task` and recorded here.

## Data model (P1-T08, 2026-11-27)
Full design: `docs/design/erd.md` (diagram and indexes) and `docs/design/data-model.md` (explanation, snapshots, invariants).

- **Variants: separate `variants` collection, one document per SKU** (with `productId` reference, `sku`, `size`, `color`, `price`, `stock`, `isActive`).
*Why:*
  - Stock for one SKU changes with one atomic conditional update on one small document; other SKUs are never touched (brief scenario 01).
  - Unique `sku` and unique `{ product, size, color }` are real database guarantees. A unique index on an embedded array only works across documents, so it would not stop duplicates inside one product's own array (MongoDB Manual, "Unique Indexes").
  - Cart and order items reference the variant `_id` directly; the product document stays small.
  - Cost accepted: listing and detail need a second query or `$lookup` for price range and in-stock flag. A denormalized `priceMin` / `priceMax` on Product can be added later if listing is slow.
- **Addresses: embedded array in User, max 10.**
*Why:* bounded, always read with the user, never shared; ownership comes free because every lookup is filtered by the user from the token; changing the default is one atomic write. Orders keep an address **snapshot**, so editing or deleting an address never changes an old order.
- **Roles: one `role` string field**, enum `admin`, `catalog_manager`, `order_operator`, `customer`, default `customer`.
*Why:* every user has exactly one role in the brief, so a single enum keeps authorization a simple "role in allowed list"; arrays or a Role collection solve problems the MVP does not have. The auth middleware reads the role from the database (it already loads the user for `isActive` and `passwordChangedAt`), so a role change applies on the next request.
- **Inventory adjustments: no separate collection.** Each adjustment is an AuditLog entry (`action: "inventory.adjusted"`, reason, signed change, before/after stock, note).
*Why:* same shape as an audit entry, and every adjustment must be audited anyway; a second collection would duplicate the facts. The "`initial_stock` only once" rule is enforced by an `initialStockSet` flag on the Variant, flipped in the same conditional update that adds the stock, not by reading the log first (read-then-write is unsafe under concurrency).
- **Order keeps no reference to its shipping zone:** only `shippingZoneName` and `shippingFee` snapshots, so editing or deleting a zone cannot affect an old order.
- **Cart stores no prices:** items are `variantId` + `quantity` only; prices are always read from the Variant by the pricing service.

## Order and payment state machines (P1-T09, 2026-11-27)
Full design: `docs/design/order-state-machine.md` (diagrams, transition tables, labels, concurrency).

- **Whitelist transition tables** for `status` and `paymentStatus`; anything not listed returns `409`.
*Why:* a list of forbidden moves always misses a case (skip, go back, leave a final state, same state twice).
- **Action endpoints, not "set status to X" from the client.** The server checks the current state against the table.
*Why:* the server owns the state; otherwise a client could jump an order from `pending` to `delivered`.
- **Two separate machines** (`status` for logistics, `paymentStatus` for money), linked by guards.
*Why:* a future online payment gateway changes only the payment machine.
- **Payment values: `pending`, `paid`, `voided`.** Cancelling an order sets `paymentStatus: voided` in the same update. No `refunded` on the Order.
*Why:* `pending` means money is still expected, so a cancelled order left `pending` would be counted in cash-to-collect and sales reports (P7-T02). A paid order can never be cancelled (paid only after `delivered`, no cancel after `shipped`); refunds after a return live in `ReturnRequest.refundStatus`.
- **Mark paid is a separate action** (`POST /api/v1/admin/orders/:id/mark-paid`, P6-T03), allowed only when `status = delivered`, `paymentMethod = cod`, `paymentStatus = pending`.
*Why:* delivery and cash collection are two facts with two actors; this keeps "delivered but not paid yet" visible.
- **Every transition is one conditional update** with the expected state (and `userId` for a customer) in the filter. Inside a transaction, a `null` result must be turned into a thrown `AppError` so the transaction aborts.
*Why:* read-check-save is a check-then-act race; a single-document write is atomic, so exactly one of two concurrent requests matches.
- **Order of checks on transition endpoints:** `401` -> `403` -> `400` -> `404` (not found or not own) -> `409` (wrong state).
- **Accepted gap:** a refused COD parcel has no path after `shipped`; a `delivery_failed` state is post-MVP.

## Open (the learner decides during `/plan-task`)
- Auth token transport (header or cookie) and the exact reset-password flow.
- Transactions versus compensating steps for order creation.
- Folder structure details (see `.claude/rules/folder-structure.md`).

## Libraries
**In scope (verify the latest version before using):** `express`, `mongoose`, `zod`, `jsonwebtoken`, `bcrypt` (or `bcryptjs`), `helmet`, `cors`, `express-rate-limit`, `dotenv` (or Node's `--env-file`), `morgan`, `slugify`, `resend`, `nodemon` (or `node --watch`), ESLint, Prettier.

**Deferred:** `multer`, `sharp`, a cloud storage SDK, `jest` or `vitest`, `supertest`, `mongodb-memory-server`, `swagger-ui-express`, `swagger-jsdoc`, `node-cron`, and the raw-body / HMAC handling needed for webhooks.

The authentication libraries are assumed to be familiar from the course. The learner will say if any library is new.
