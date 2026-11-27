# Phase 4: Cart, shipping, coupons, quote

Goal of the phase: an editable cart, shipping fees by governorate zone, coupons with validity and usage rules, and one pricing service that computes the checkout quote. The same pricing service is reused by order creation in Phase 5, which is how "quote total = stored order total" (brief scenario 02) is guaranteed.

---

### P4-T01 Shipping zones

**Goal:** The admin groups governorates into shipping zones, each with a delivery fee.
**Source:** Brief section 01 ("shipping is configured by zone/flat rate"); EC-06; decisions "Shipping".
**Depends on:** P2-T09, P2-T10.

**Scope**
- Endpoints (admin only):
  - `GET /api/v1/admin/shipping-zones` (paginated), `GET /api/v1/admin/shipping-zones/:id`
  - `POST /api/v1/admin/shipping-zones`, `PATCH /api/v1/admin/shipping-zones/:id`, `DELETE /api/v1/admin/shipping-zones/:id` (decide hard delete vs deactivate).
- Data: name (unique), governorates (non-empty list from the shared governorate constant from P2-T09), fee (integer piasters, >= 0), active flag.
- Business rules: **a governorate belongs to at most one active zone.** Enforce this so that two concurrent requests cannot break it either (think about where the guarantee must live). A governorate in no active zone means "no delivery there".
- Audit: creating a zone and changing a fee write entries.

**Acceptance criteria (verify in Postman)**
- Zone "Greater Cairo" with Cairo, Giza, Qalyubia, fee 5000 -> `201`.
- Second zone that includes Giza -> `409`.
- Unknown governorate -> `400`. Fee `-1` or `25.5` -> `400`.
- Fee change -> audit entry with before/after.
- Unknown zone id -> `404`.
- No token -> `401`. Catalog manager, order operator, or customer -> `403`.

**Concepts to review:** enforcing cross-document uniqueness (unique index on an array field and its behavior, or a different data shape); configuration data as a resource.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P4-T02 Cart: add item and view cart

**Goal:** A logged-in customer adds variants to a persistent cart and sees it with live prices and an accurate subtotal.
**Source:** EC-04; brief section 06 (Cart / CartItem: "editable shopping intention, not a finalized sale").
**Depends on:** P3-T08.

**Scope**
- Endpoints (customer only, own cart only; the cart is found from the token, never from an id in the request):
  - `GET /api/v1/cart`
  - `POST /api/v1/cart/items`: variant id and quantity. Adding a variant already in the cart increases its quantity (or replaces it; choose and document).
- Data: one cart per user (enforced by a unique index), items with `variantId` and quantity only. Decided in P1-T08: **no price is stored in the cart**; prices are always read from the variant by the server. Add the maximum number of cart lines as a config value (the cart array must stay bounded).
- Business rules: quantity is a positive integer up to a maximum per line; the variant and its product must be active; the requested total quantity must not exceed current stock (this is a friendly check, not the guarantee; the guarantee is in P5-T02).
- `GET /cart` returns each line with current title, SKU, size/color, unit price, line total, and the subtotal, all computed by the server.

**Not in this task:** update/remove (next task), shipping, coupons.

**Acceptance criteria (verify in Postman)**
- Add 2 of variant A -> `201`/`200`; `GET /cart` shows the line and a correct subtotal in piasters.
- Add the same variant again -> quantity follows your rule.
- Quantity `0`, `-1`, `1.5` -> `400`. More than stock -> `409`.
- Inactive variant or unknown variant id -> `404` (or `409`, documented).
- No token -> `401`. Staff token (admin, catalog manager, order operator) -> `403`.
- Customer B's `GET /cart` never shows customer A's items (the cart comes from the token).

**Concepts to review:** server-side recalculation; why a cart is not an order; upsert and one-document-per-user.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P4-T03 Cart: update, remove, clear, stale items

**Goal:** Customers change quantities, remove items, clear the cart, and see clearly when an item became unavailable.
**Source:** EC-04.
**Depends on:** P4-T02.

**Scope**
- Endpoints (customer, own cart):
  - `PATCH /api/v1/cart/items/:variantId`: new quantity.
  - `DELETE /api/v1/cart/items/:variantId`
  - `DELETE /api/v1/cart`
- Stale items: when a variant was deactivated, its stock dropped below the cart quantity, or its price changed, `GET /cart` still loads and marks each problem line (for example unavailable, not enough stock with the available amount). Unavailable lines do not count in the subtotal. Decide whether the cart fixes them automatically or only reports them.

**Acceptance criteria (verify in Postman)**
- Update quantity -> subtotal changes. Remove -> line gone. Clear -> empty cart.
- Variant not in the cart (including a variant that is only in another customer's cart) -> `404`; the other cart is unchanged.
- No token -> `401`. Staff token -> `403`.
- Deactivate a variant (staff) -> customer's `GET /cart` marks that line and excludes it from the subtotal.
- Lower stock below the cart quantity with an inventory adjustment -> the line shows the problem.

**Concepts to review:** designing responses that explain partial failure; eventual staleness of client-side data.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P4-T04 Coupons (admin CRUD)

**Goal:** The admin creates and manages coupons with type, value, validity, and usage rules.
**Source:** EC-08; decisions "Coupons".
**Depends on:** P2-T10.

**Scope**
- Endpoints (admin only): `GET /api/v1/admin/coupons` (paginated, filter by active/expired), `GET /api/v1/admin/coupons/:id`, `POST /api/v1/admin/coupons`, `PATCH /api/v1/admin/coupons/:id`, and deactivate.
- Data: code (unique, stored uppercase, trimmed), type (`percent` or `fixed`), value, maximum discount cap (percent only), minimum subtotal, starts at, expires at, global usage limit (optional means unlimited), used count (server-managed, starts at 0), active flag.
- Validation: percent value is an integer from 1 to 100; fixed value is a positive integer in piasters; cap only for percent; `expiresAt` after `startsAt`; `usedCount` is never accepted from the client.
- Business rules: decide which fields may change after a coupon has been used at least once (for example changing the value of a used coupon), and justify.
- Audit: create, any value/limit change, deactivation.

**Not in this task:** applying a coupon (P4-T06), counting usage (P5-T02).

**Acceptance criteria (verify in Postman)**
- Create `SAVE10` percent 10, cap 20000 -> `201`, stored uppercase.
- `save10` again -> `409`. Percent 150 -> `400`. Fixed `10.5` -> `400`. Expiry before start -> `400`.
- Body with `usedCount` -> rejected or ignored, per your rule.
- Unknown coupon id -> `404`.
- No token -> `401`. Catalog manager, order operator, or customer -> `403`.

**Concepts to review:** discriminated validation with Zod (rules depending on `type`); immutable vs mutable fields.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P4-T05 Pricing service and checkout quote (no coupon)

**Goal:** One pricing service computes the full order amount from the cart and a chosen address. The quote endpoint exposes it.
**Source:** EC-06; brief section 03 ("the server recalculates prices and stock, never trusting client totals"); decisions "Quote and order".
**Depends on:** P4-T01, P4-T03.

**Scope**
- Endpoint: `POST /api/v1/checkout/quote` (customer). Body: address id (and later a coupon code). Nothing else; no prices, totals, or user id from the client.
- Pricing service (a service function, **not** inside the controller, because order creation will call the same function): loads the cart, current variant prices and stock, the address (must belong to the user), and the shipping zone for its governorate. Returns lines, subtotal, shipping fee, discount (0 for now), total, currency `EGP`.
- Business rules: empty cart -> rejected; any unavailable or short-stock line -> rejected with details of which lines (not silently dropped); governorate with no active zone -> rejected with a clear message ("we do not deliver to X yet"); nothing is stored.

**Not in this task:** coupons (next task), creating the order.

**Invariants that apply:** the server computes totals from current trusted price rules (section 06).

**Acceptance criteria (verify in Postman)**
- Cart with 2 x 25000 and an address in a zone with fee 5000 -> subtotal 50000, shipping 5000, total 55000.
- Another user's address id -> `404`.
- Empty cart -> `400` or `409` (documented).
- Address in a governorate with no zone -> `409` (or `400`), clear message.
- Change a variant price as staff, quote again -> new price is used.
- No token -> `401`. Staff token -> `403`.

**Concepts to review:** keeping business rules out of controllers; pure calculation vs data loading; designing a function for reuse.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P4-T06 Coupon application in the quote

**Goal:** The quote accepts an optional coupon code and applies it with all validity and usage rules.
**Source:** EC-08; EC-06 ("promotion"); brief section 09 scenario 02.
**Depends on:** P4-T04, P4-T05.

**Scope**
- Endpoint: `POST /api/v1/checkout/quote` now accepts an optional coupon code.
- Pricing service rules (case-insensitive code): coupon exists and is active; now is between start and expiry; used count is below the global limit; subtotal is at least the minimum. Percent: discount = percent of the subtotal, rounded with a rule you choose and document, then capped. Fixed: discount = value. **Discount never exceeds the subtotal; shipping is never discounted; total is never negative.**
- Response shows the applied coupon code and discount, or a specific reason it was rejected.
- Decide: an invalid coupon fails the whole quote, or returns the quote without the discount plus a warning. Choose and document (order creation must behave the same).

**Not in this task:** incrementing used count (P5-T02).

**Invariants that apply:** totals computed by the server from current rules; discounts can never make the total negative (EC-08).

**Acceptance criteria (verify in Postman)**
- Brief scenario 02: subtotal 50000, `SAVE10` (10%) -> discount 5000, shipping 5000, total 50000.
- Percent coupon with cap 3000 on subtotal 50000 -> discount 3000.
- Fixed coupon 80000 on subtotal 50000 -> discount 50000, total = shipping only.
- Expired, not yet started, inactive, limit reached, below minimum subtotal, unknown code -> each gives a clear, distinct reason.
- Odd amount (for example 10% of 33333) -> rounding follows your documented rule.
- No token -> `401`. Staff token -> `403`. Another user's address id with a valid coupon -> still `404`.

**Concepts to review:** integer rounding of money; guarding totals; one source of truth for pricing.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, and `/review-task` has returned "Ready".
