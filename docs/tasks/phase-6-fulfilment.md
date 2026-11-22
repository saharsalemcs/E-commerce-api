# Phase 6: Fulfilment and admin operations

Goal of the phase: staff run orders from `pending` to `delivered` through the state machine from P1-T09, confirm COD payment, cancel when allowed, and the role model is checked end to end.

Roles in this phase: order operations are allowed to `admin` and `order_operator`.

---

### P6-T01 Admin order queue

**Goal:** Staff see a filterable, paginated queue of orders and open any order.
**Source:** EC-12 ("admin views order queue"); brief section 02 (order operator).
**Depends on:** P5-T04.

**Scope**
- Endpoints (admin, order operator):
  - `GET /api/v1/admin/orders`: paginated; filters: status (one or several), payment status, date range, order number, customer email or id; sort by date (oldest first is useful for a work queue; choose the default).
  - `GET /api/v1/admin/orders/:id`: full order including customer contact, address snapshot, history, and the allowed next actions for its current status.
- Indexes that support the main filters plus sort.

**Acceptance criteria (verify in Postman)**
- Filter `status=pending` -> only pending orders, in your default order.
- Date range with `from` after `to` -> `400`.
- Unknown order id -> `404`.
- No token -> `401`. Catalog manager or customer -> `403`.
- Detail lists allowed next actions that match your state diagram.

**Concepts to review:** compound indexes and the equality-sort-range rule; `explain()` to check index use.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, and `/review-task` has returned "Ready".

---

### P6-T02 Order status transitions

**Goal:** Staff move an order through `pending -> accepted -> packing -> shipped -> delivered`; every other transition is rejected.
**Source:** EC-12; brief section 03 (fulfilment); decisions "Order flow"; your state diagram (P1-T09).
**Depends on:** P6-T01.

**Scope**
- Endpoint design is yours: one `PATCH /api/v1/admin/orders/:id/status` with a target status, or one action endpoint per transition (for example `POST /api/v1/admin/orders/:id/ship`, as in brief section 07). Compare both and choose.
- One transition table in one place (the service) decides what is allowed; controllers never decide.
- Each transition is a conditional update on the current status (two operators pressing "ship" at the same time -> one succeeds, the other gets `409`).
- Each transition appends to `statusHistory` (status, at, by) and writes an audit entry.
- Shipment fields: set `shippedAt` on shipped (plus optional carrier name and tracking note in the body) and `deliveredAt` on delivered.
- Cancellation is not done here (P6-T04).

**Acceptance criteria (verify in Postman)**
- Walk an order through all statuses -> each `200`; history has 5 entries; timestamps set.
- `pending -> shipped`, `delivered -> packing`, any move from `cancelled` -> `409`.
- Two quick identical "ship" requests (Postman runner or your P5-T03 script pattern) -> one `200`, one `409`.
- Unknown order id -> `404`.
- No token -> `401`. Catalog manager or customer -> `403`.

**Concepts to review:** state machines in code; optimistic concurrency via conditional filters; command-style endpoints vs generic PATCH.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P6-T03 COD payment confirmation

**Goal:** When a COD order is delivered, an order operator or admin records the cash as paid, exactly once.
**Source:** EC-09 (COD); brief section 02 (order operator: "limited payment actions"); decisions "Order flow"; section 06 ("paid, cancelled and refunded are distinct states").
**Depends on:** P6-T02.

**Scope**
- Endpoint: `POST /api/v1/admin/orders/:id/mark-paid` (admin, order operator), or set it as part of the delivered transition if your state diagram says so. Choose and keep it consistent with P1-T09.
- Business rules: only when status is `delivered`, payment method `cod`, and payment status `pending`; conditional update so it happens once; store who confirmed it and when (for example `paidAt`); audit entry (financial change).

**Invariants that apply:** a paid event happens once; payment status is separate from fulfilment status.

**Acceptance criteria (verify in Postman)**
- Delivered COD order -> `200`, payment status `paid`, `paidAt` set, audit entry.
- Same request again -> `409`; one audit entry only.
- Order in `shipped` -> `409`.
- Unknown order id -> `404`.
- No token -> `401`. Catalog manager or customer -> `403`.

**Concepts to review:** separating payment state from order state; idempotent operations.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P6-T04 Staff cancellation

**Goal:** Staff cancel orders until before `shipped`, reusing the cancellation service from P5-T05.
**Source:** EC-12 ("permitted cancellation paths"); brief section 07 (`POST /admin/orders/{id}/cancel`); decisions "Order flow".
**Depends on:** P6-T02, P5-T05.

**Scope**
- Endpoint: `POST /api/v1/admin/orders/:id/cancel` (admin, order operator). Body: reason (required for staff).
- Business rules: allowed from `pending`, `accepted`, `packing`; same transaction and restoration as P5-T05 (stock, coupon usage, history, audit); records that staff cancelled it, not the customer.
- No duplication: the staff and customer endpoints share one service; only the allowed states and the actor differ.

**Acceptance criteria (verify in Postman)**
- Order in `packing` -> `200`; stock restored; coupon usage released.
- Order in `shipped` -> `409`.
- Missing reason -> `400`.
- Cancel twice -> second `409`, stock restored once.
- Unknown order id -> `404`.
- No token -> `401`. Catalog manager or customer -> `403`.

**Concepts to review:** parameterizing a service by policy (who may, from which states).

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P6-T05 Permissions matrix and role walkthrough

**Goal:** Document every endpoint against every role and verify the matrix in Postman with one account per role.
**Source:** Brief section 02 ("explicit roles plus ownership checks on every backend request"); brief section 05 definition of done ("an unauthorized user is rejected").
**Depends on:** P6-T04.

**Scope**
- A table in `docs/design/` listing each endpoint, which roles may call it, and which ownership rule applies.
- A Postman folder that runs a representative request for each endpoint group with each role's token, expecting `200`/`201`, `401`, `403`, or `404` as the table says.
- Fix any mismatch you find (each fix is a small commit).

**Acceptance criteria**
- The table covers every endpoint built so far.
- Running the folder shows no unexpected status.
- For every endpoint group the folder has the three cases: no token -> `401`, wrong role -> `403`, and (for customer-owned resources: address, cart, order) another customer's id -> `404`.
- Staff calling customer-only endpoints -> `403`.

**Concepts to review:** role-based access control (RBAC); defense in depth; why "hiding a button" is not authorization.

**Definition of done:** the table and the Postman folder exist, all checks pass, and `/review-task` has returned "Ready".
