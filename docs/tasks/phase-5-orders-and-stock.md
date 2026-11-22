# Phase 5: Orders and stock

Goal of the phase: turn a cart into a unique order with price snapshots, deduct stock atomically inside a transaction so the last unit can never be sold twice, let customers see and cancel their own orders, and prove the race handling with a script.

Business invariants for the whole phase (brief section 06, adjusted by `01-scope.md`):
- The server computes order totals from current trusted price rules and saves a snapshot at checkout.
- No order may take more than the available stock (no reservations in the MVP; deduction happens at order creation).
- Paid, cancelled, and refunded are distinct states; later changes never overwrite history.

---

### P5-T01 Order model and place order (snapshots, no stock yet)

**Goal:** Create the Order model and the place-order endpoint that recomputes everything with the pricing service and stores snapshots. Stock and coupon usage come in the next task.
**Source:** EC-07 ("unique order with line-item snapshots"); EC-09 (COD only); brief section 06 (Order / OrderItem); decisions "Quote and order".
**Depends on:** P4-T06, P1-T09.

**Scope**
- Endpoint: `POST /api/v1/orders` (customer). Body: address id, optional coupon code, optional `expectedTotal`, payment method (only `cod` accepted).
- Data (follow your ERD):
  - Order number: unique and human-readable (for example a prefix plus date plus sequence, or a random short code). Decide how to generate it without collisions; it is separate from `_id`.
  - Items: product id, variant id, SKU, title, size, color, unit price, quantity, line total, all as **snapshots**.
  - Address snapshot (not a reference only), subtotal, discount, coupon snapshot (code, type, value), shipping fee, total, currency `EGP`.
  - Status (`pending` on creation), payment method `cod`, payment status `pending`, `statusHistory` with the first entry, shipment fields (empty for now), cancellation fields (empty), timestamps.
- Business rules: totals come only from the pricing service; if `expectedTotal` is sent and differs from the recomputed total -> rejected with the new total so the client can show it; the cart is cleared after the order is created.

**Not in this task:** stock deduction and coupon usage count (next task). Until P5-T02 is done, this endpoint can oversell; that is expected.

**Acceptance criteria (verify in Postman)**
- Quote, then place order with the same address and coupon -> `201`; stored total equals the quote total (brief scenario 02).
- Change a product's price after the order -> the order's snapshot price does not change.
- `expectedTotal` that is wrong -> `409` with the current total; correct -> `201`.
- Payment method other than `cod` -> `400`. Another user's address -> `404`. Empty cart -> rejected.
- Body containing `total`, `status`, `paymentStatus`, or `user` -> ignored or rejected; DB values are the server's.
- No token -> `401`. Staff token -> `403`.

**Concepts to review:** snapshots vs references; generating unique human-readable ids (counter documents with atomic increments, or random codes with a unique index and retry).

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P5-T02 Transactional order creation with atomic stock and coupon usage

**Goal:** Order creation deducts stock for every line and counts coupon usage atomically, all inside one transaction, so a failure leaves nothing half-done.
**Source:** EC-07 ("prevent overselling using atomic deduction"); EC-08 ("usage rules"); brief section 09 (stock safety); decisions "Coupons", "Open: transactions vs compensating steps".
**Depends on:** P5-T01.

**Scope**
- Inside one transaction: for each line, a conditional atomic stock decrement that succeeds only if enough stock remains; if a coupon is applied, a conditional atomic increment of its used count that succeeds only if the limit is not reached; create the order; clear the cart; write audit entries for the stock changes (and decide if the audit write is inside the transaction).
- If any step fails, nothing is kept: no stock change, no coupon usage, no order, cart unchanged. The client gets `409` with which line (or the coupon) failed.
- Record in `docs/02-decisions.md` why you chose a transaction over compensating steps (this closes that open decision).
- Read the Mongoose 9 transactions page first: it says operations inside a transaction must **not** run in parallel (no `Promise.all` inside the transaction).
- Think about transient transaction errors and retries (what the helper you use does for you).

**Invariants that apply:** no order takes more than available stock; quote total = stored total; coupon global limit never exceeded.

**Acceptance criteria (verify in Postman)**
- Brief scenario 01: product with 2 variants, order 1 of variant A -> only A's stock goes down by 1.
- Stock 1, order quantity 2 -> `409`; stock still 1, no order, cart unchanged.
- Cart with lines A (enough stock) and B (not enough) -> `409`; A's stock **unchanged** (proves rollback).
- Coupon with limit 1 already used once -> `409`; nothing changed.
- Successful order -> coupon used count +1, audit entries for each stock change.
- Still true from P5-T01: no token -> `401`; staff token -> `403`; another user's address -> `404`, and nothing changed.

**Concepts to review:** MongoDB multi-document transactions and sessions; passing the session to every operation; `Connection#transaction()` vs `session.withTransaction()` (Mongoose 9 docs); atomicity vs isolation.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P5-T03 Concurrency verification script

**Goal:** Prove with real concurrent requests that the last unit and the last coupon use are taken exactly once.
**Source:** Brief section 09 ("two users try to purchase the last SKU: only one accepted order"); decisions "Concurrency check".
**Depends on:** P5-T02.

**Scope**
- A script in `scripts/` that: logs in several test customers (or uses tokens), prepares each cart with the same variant, and sends `POST /orders` for all of them at the same moment (`Promise.all`). It prints how many succeeded and failed and the final stock.
- Set up stock through the inventory-adjustment endpoint (P3-T05), never by editing the DB.
- Scenario A: stock 1, 5 customers -> exactly 1 order, stock 0, 4 x `409`.
- Scenario B: coupon limit 1, plenty of stock, 5 customers using it -> exactly 1 order with the coupon.
- The script reads its base URL and test credentials from config or arguments, never hardcoded secrets. It talks to the API over HTTP (it is a client, not a direct DB writer), apart from optional setup.
- Write in the task notes what you would expect to see if you removed the conditional update (try it on a branch, then restore).

**Not in this task:** a test framework (deferred).

**Acceptance criteria**
- Both scenarios print the expected counts on several runs.
- DB check after each run: stock and coupon used count match the number of successful orders.

**Concepts to review:** race conditions; why sequential manual Postman tests cannot show them; `Promise.all` vs `Promise.allSettled` for collecting results.

**Definition of done:** both scenarios pass repeatedly, database state is correct, and `/review-task` has returned "Ready".

---

### P5-T04 Customer order history

**Goal:** Customers list and open their own orders, with readable status labels.
**Source:** Brief section 07 (`GET /me/orders`); brief section 08 ("human-readable status labels", "unique order references"); brief section 02 (ownership).
**Depends on:** P5-T01.

**Scope**
- Endpoints (customer, own orders only):
  - `GET /api/v1/users/me/orders`: paginated, newest first, optional status filter. Each item: order number, date, status and its label, item count, total.
  - `GET /api/v1/users/me/orders/:id`: full order with snapshots, status history, payment status.
- Business rules: lookups always filter by the user from the token; dates are ISO 8601 UTC.

**Acceptance criteria (verify in Postman)**
- Customer A sees only A's orders. A opens B's order id -> `404`.
- No token -> `401`. Staff token -> `403` (staff use the admin queue in P6-T01).
- Status filter with an unknown status -> `400`.
- Detail shows the snapshot prices, not current prices.

**Concepts to review:** ownership in queries vs checking after loading; list vs detail representations.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, and `/review-task` has returned "Ready".

---

### P5-T05 Customer cancellation

**Goal:** A customer cancels their own order while it is `pending` or `accepted`; stock and coupon usage are restored in the same transaction.
**Source:** EC-12 ("permitted cancellation paths"); decisions "Order flow"; your state diagram (P1-T09).
**Depends on:** P5-T02.

**Scope**
- Endpoint: `POST /api/v1/users/me/orders/:id/cancel` (customer, own order). Body: optional reason.
- Build the cancellation logic as a **service function** that P6-T04 (staff cancellation) will reuse with different allowed states.
- Inside one transaction: change status to `cancelled` **only if** the current status is still allowed (conditional update, so a concurrent status change by staff cannot be overwritten); restore stock for every line with atomic increments; decrement the coupon used count if a coupon was used; add a `statusHistory` entry and cancellation details (who, when, reason); write audit entries.
- Payment status after cancellation follows your state diagram.

**Invariants that apply:** cancelled is a distinct state; history is appended, never overwritten; stock restored exactly once.

**Acceptance criteria (verify in Postman)**
- Pending order of 2 units -> `200`; stock +2; coupon used count -1; history has the cancel entry.
- Cancel the same order again -> `409`; stock **not** increased twice.
- Order in `packing` (set it in the DB for now) -> `409`.
- Another user's order -> `404`; that order is unchanged.
- No token -> `401`. Staff token -> `403` (staff use P6-T04).

**Concepts to review:** idempotency of state changes; conditional updates on status; reusing services across roles.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".
