# Phase 7: Stretch and polish

Goal of the phase: the stretch items from the scope (emails, reports, basic returns) and the handover package (seed, README, ERD, Postman). Start only when Phases 1 to 6 are "Ready".

---

### P7-T01 Order emails

**Goal:** Customers get an email when an order is placed and when it is shipped, delivered, or cancelled.
**Source:** EC-16 ("order confirmation and status changes"); decision "Email: Resend".
**Depends on:** P6-T04, P2-T07.

**Scope**
- Use the email wrapper from P2-T07. Templates (plain HTML is fine) with order number, items, total in EGP, and the status label. Show dates in Africa/Cairo time (display only; storage stays UTC).
- Business rules: an email is sent **after** the transaction commits; a failed email never fails or rolls back the order; failures are logged.
- Decide how to keep emails out of controllers (called from the service after commit, or a small event emitter). Explain the trade-off.

**Acceptance criteria (verify in Postman)**
- Place an order -> confirmation email arrives (or shows in the Resend dashboard).
- Ship, deliver, cancel -> one email each.
- Break the Resend key in config -> the order still succeeds, the failure is logged.

**Concepts to review:** side effects after commit; in-process events in Node (`EventEmitter`); formatting money and dates for display (`Intl.NumberFormat`, `Intl.DateTimeFormat` with a time zone).

**Definition of done:** all acceptance criteria pass in Postman, database state is correct, and `/review-task` has returned "Ready".

---

### P7-T02 Sales summary report

**Goal:** The admin sees revenue and order counts for a date range.
**Source:** EC-16 ("dashboard for revenue, order count").
**Depends on:** P6-T03.

**Scope**
- Endpoint: `GET /api/v1/admin/reports/sales` (admin). Query: date range (required, with a maximum span you choose).
- Output: revenue (define it: for example sum of totals of delivered and paid orders), number of orders per status, average order value, number of orders that used a coupon and the total discount given.
- Computed with a MongoDB aggregation pipeline, not by loading all orders into JavaScript.
- Decide the "day" boundary: UTC or Africa/Cairo. Document the choice.

**Not in this task:** payment failures (no online payments in the MVP).

**Acceptance criteria (verify in Postman)**
- Known seeded data -> numbers match a manual count.
- Cancelled orders never count as revenue.
- Missing or reversed date range -> `400`.
- No token -> `401`. Catalog manager, order operator, or customer -> `403`.

**Concepts to review:** aggregation pipeline stages (`$match`, `$group`, `$facet`); time zones in date grouping.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, and `/review-task` has returned "Ready".

---

### P7-T03 Low-stock report

**Goal:** Staff see which active SKUs are at or below a stock threshold.
**Source:** EC-16 ("low stock").
**Depends on:** P3-T05.

**Scope**
- Endpoint: `GET /api/v1/admin/reports/low-stock` (admin, catalog manager). Query: threshold (default from config), pagination.
- Output per SKU: product title, SKU, size, color, current stock; lowest stock first.
- Only active variants of active products.

**Acceptance criteria (verify in Postman)**
- Threshold 5 -> only SKUs with stock <= 5.
- Inactive variants never appear.
- No token -> `401`. Order operator or customer -> `403`.

**Concepts to review:** querying (or `$unwind`-ing) variants depending on your model; index support for the threshold filter.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, and `/review-task` has returned "Ready".

---

### P7-T04 Return requests (recording only)

**Goal:** Customers request a return for a delivered order; staff record its progress. No money moves through a provider.
**Source:** EC-13 (recording part only); brief section 06 (ReturnRequest; "refunds/returns do not overwrite payment history"); `01-scope.md` (stretch).
**Depends on:** P6-T03.

**Scope**
- Endpoints:
  - `POST /api/v1/users/me/orders/:id/return-requests` (customer, own delivered order): items (from the order, with quantity not above what was bought), reason.
  - `GET /api/v1/users/me/return-requests` (customer, own).
  - `GET /api/v1/admin/return-requests` (admin, order operator), paginated, filter by status.
  - `PATCH /api/v1/admin/return-requests/:id` (admin, order operator): move status.
- Data: order ref, user, items, reason, status (for example requested, approved, rejected, received), refund status kept **separately** (for example not_required, pending, refunded_manually), history, timestamps.
- Business rules: only within a return window after `deliveredAt` (value from config); one open request per order (or per item; choose); the order's payment status and history are never overwritten; no automatic restock (staff use an inventory adjustment if goods return to stock); audit entries for status changes.

**Not in this task:** provider refunds (deferred).

**Acceptance criteria (verify in Postman)**
- Delivered order -> `201`. Not delivered -> `409`. After the window -> `409`.
- Quantity above what was bought or an item not in the order -> `400`.
- Another user's order -> `404`. Invalid status move -> `409`.
- Customer endpoints: no token -> `401`; staff token -> `403`.
- Admin endpoints: no token -> `401`; catalog manager or customer -> `403`; unknown return request id -> `404`.

**Concepts to review:** keeping related but separate state machines (return vs refund vs payment).

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P7-T05 Full seed script

**Goal:** One command fills a fresh database with realistic demo data and test accounts for every role.
**Source:** `01-scope.md` (keep "repeatable seeds"); brief section 10 (handover).
**Depends on:** P6-T05.

**Scope**
- Script in `scripts/` that creates: one account per role (credentials from config), a few customers with addresses in different governorates, categories, products with multiple variants (including some low-stock and one inactive), shipping zones covering some governorates, valid/expired/used-up coupons, and a few orders in different statuses.
- Business rules: refuses to run when `NODE_ENV` is production; has a clear "wipe and reseed" mode vs "add if missing"; money in piasters; uses the same model validation as the app (no bypassing).
- Variant stock is set through the inventory-adjustment service with reason `initial_stock` (variants start at `0`, as in the app), so every seeded stock value has an audit entry. No direct stock writes.
- Decide whether orders are created through services (stock stays consistent) or inserted directly (then stock must be adjusted to match). Justify.

**Acceptance criteria**
- Fresh DB -> run once -> every Postman folder works with the seeded accounts.
- Run again -> no duplicate errors, data still consistent.
- With `NODE_ENV=production` -> refuses.

**Concepts to review:** reproducible environments; fixtures; why seeds should respect business rules.

**Definition of done:** all acceptance criteria pass, database state is correct, and `/review-task` has returned "Ready".

---

### P7-T06 README, final ERD, Postman export

**Goal:** Someone else can clone, configure, seed, run, and explore the API without asking you.
**Source:** Brief section 10 (minimum handover package, without tests and Docker); `01-scope.md`.
**Depends on:** P7-T05.

**Scope**
- README: what the project is, stack and versions, setup (Node version, Atlas, `.env` from `.env.example`), scripts (dev, start, lint, seed, concurrency check), test accounts (from the seed), folder structure, API conventions (response shape, errors, pagination, money, dates), known limitations, and next steps (the deferred list).
- ERD and state diagrams in `docs/design/` updated to match the final code.
- Postman collection and environment exported into the repo (for example `postman/`), with no secrets and with a short note on how to use them.

**Acceptance criteria**
- Follow the README from a fresh clone on a clean folder -> app runs and the collection works.
- No secret appears in any committed file (`git grep` for your key prefixes).

**Concepts to review:** writing docs for a new reader; what belongs in README vs `docs/`.

**Definition of done:** a fresh-clone walkthrough works, and `/review-task` has returned "Ready".
