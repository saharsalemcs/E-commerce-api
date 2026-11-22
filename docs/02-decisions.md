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

- **Module system:** CommonJS (`"type": "commonjs"`), decided by the learner during P1-T01 (2026-11-22). This changes the earlier choice of ESM. Use `require` and `module.exports` consistently across the whole project; do not mix with `import`/`export`.
- **Env loading:** `dotenv`, chosen by the learner in P1-T03 (reason to be added by the learner). Config lives in `src/config/index.js`; it validates with Zod at startup and exits with a message that names the key and never prints values.
- **MongoDB hosting:** MongoDB Atlas (replica set, so transactions are available).

## Confirmed in the Understand step (2026-11-22)
- Cash on Delivery only. The Order has `paymentMethod` and `paymentStatus` fields (default status for COD is pending) so a gateway can be added later without redesigning the Order.
- Product `images` is an array of URL strings until file upload is learned.
- Stock is deducted atomically when the order is created. No `StockReservation` with expiry and no scheduled job while there is no online payment.
- Guest carts are deferred (logged-in carts only). Tax is not implemented. Basic returns are a stretch item in the last phase. Docker is out.

### Order flow
- An order is created as `pending`. An order operator or admin moves it `pending -> accepted -> packing -> shipped -> delivered`. Any other transition is rejected.
- A customer may cancel their own order only while it is `pending` or `accepted`. Staff may cancel until before `shipped`. After `shipped` there is no cancellation (returns instead).
- Cancellation restores the stock and the coupon usage in the same transaction.
- COD `paymentStatus` becomes `paid` at `delivered`, set by an order operator or admin.

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

## Open (the learner decides during `/plan-task`)
- Variant modeling: embedded in the product or a separate collection.
- API response and error shape.
- Auth token transport (header or cookie) and the exact reset-password flow.
- Role storage (single role field or other).
- Transactions versus compensating steps for order creation.
- Folder structure details (see `.claude/rules/folder-structure.md`).

## Libraries
**In scope (verify the latest version before using):** `express`, `mongoose`, `zod`, `jsonwebtoken`, `bcrypt` (or `bcryptjs`), `helmet`, `cors`, `express-rate-limit`, `dotenv` (or Node's `--env-file`), `morgan`, `slugify`, `resend`, `nodemon` (or `node --watch`), ESLint, Prettier.

**Deferred:** `multer`, `sharp`, a cloud storage SDK, `jest` or `vitest`, `supertest`, `mongodb-memory-server`, `swagger-ui-express`, `swagger-jsdoc`, `node-cron`, and the raw-body / HMAC handling needed for webhooks.

The authentication libraries are assumed to be familiar from the course. The learner will say if any library is new.
