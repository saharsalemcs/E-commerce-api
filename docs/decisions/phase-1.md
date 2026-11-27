
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
