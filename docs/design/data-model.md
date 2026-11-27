# Data model (MVP)

Explains the ERD in [erd.md](erd.md). Decisions are also recorded in [../02-decisions.md](../02-decisions.md).

Sources checked: MongoDB Manual "Embedded Data", "Avoid Unbounded Arrays", "Unique Indexes" (unique constraint across separate documents) and "Multikey Indexes"; Mongoose 9 docs "Validation" (update validators). Read through Context7, 2026-11-27.

## 1. Collections

| Collection | Module | Embeds | References |
|---|---|---|---|
| `users` | users / auth | addresses | none |
| `categories` | catalog | none | none |
| `products` | catalog | images (URL strings), attributes | category |
| `variants` | catalog | none | product |
| `shippingzones` | shipping | governorates (strings) | none |
| `carts` | cart | items | user, variant (per item) |
| `coupons` | coupons | none | none |
| `orders` | orders | items, shipping address, coupon, status history | user, variant/product/coupon (per snapshot) |
| `returnrequests` | orders (returns) | items, history | order, user |
| `auditlogs` | audit | changes, metadata | actor (user), entity (any) |

Not modeled, on purpose:
- **StockReservation**: deferred. Stock is deducted inside the order transaction, so there is no "reserved" stock. Available stock = `variant.stock`.
- **PaymentAttempt**: deferred with online payments. The Order already has `paymentMethod` and `paymentStatus`, so a gateway can add a PaymentAttempt collection later without changing the Order.
- **Shipment**: decided to live inside the Order (`carrier`, `trackingNote`, `shippedAt`, `deliveredAt`, plus `statusHistory`).
- **ProductImage**: decided as an array of URL strings on the Product until file upload is learned.
- **InventoryAdjustment**: no separate collection. Each adjustment is an AuditLog entry (see 3.4).
- **ChatConversation**: out of scope.
- **Counter** (optional): only if P5-T01 chooses a sequence-based `orderNumber`. A random code with a unique index and retry needs no extra collection.
- Phase 8 extras (Brand, Subcategory, Review, Wishlist) are designed in their own tasks.

## 2. Entities

Legend: **Req** = required. Money is `Number` (integer piasters). Every collection also has `_id` and `createdAt` / `updatedAt` (Mongoose `timestamps`), which are not repeated below.

### 2.1 User (`users`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `name` | String | yes | trimmed | |
| `email` | String | yes | **unique**, lowercase, trimmed | login identifier |
| `phone` | String | yes | Egyptian mobile format | |
| `passwordHash` | String | yes | `select: false` | never returned |
| `role` | String | yes | enum `admin`, `catalog_manager`, `order_operator`, `customer`; default `customer` | see 3.3 |
| `isActive` | Boolean | yes | default `true` | inactive users cannot log in |
| `passwordChangedAt` | Date | no | | tokens issued before it are rejected |
| `passwordResetTokenHash` | String | no | `select: false` | hash only, cleared after use |
| `passwordResetExpiresAt` | Date | no | `select: false` | short expiry |
| `addresses` | [Address] | no | embedded, max 10 | see 2.2 |

Indexes: `{ email: 1 }` unique; `{ role: 1, isActive: 1 }`.

Notes:
- One document per person, customer or staff. Register always creates `customer`.
- The `{ role, isActive }` index supports the "at least one active admin" check.

### 2.2 Address (embedded in `users.addresses`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | | sent as `addressId` in `POST /orders` |
| `label` | String | yes | for example "Home" | |
| `recipientName` | String | yes | | |
| `phone` | String | yes | Egyptian mobile format | |
| `governorate` | String | yes | from the shared governorate constant | same list as shipping zones |
| `city` | String | yes | city / area | |
| `street` | String | yes | | |
| `building` | String | yes | | |
| `apartment` | String | no | floor / apartment | |
| `notes` | String | no | | |
| `isDefault` | Boolean | yes | default `false`; at most one `true` | the first address becomes default |

Notes:
- Bounded (max 10) and owned by one user, so it is embedded (see 3.2).
- An order copies the address as a snapshot, so editing or deleting it never changes old orders.

### 2.3 Category (`categories`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `name` | String | yes | **unique**, case-insensitive | |
| `slug` | String | yes | **unique**, server-generated | never sent by the client |
| `description` | String | no | | |
| `isActive` | Boolean | yes | default `true` | |

Indexes: `{ slug: 1 }` unique; `{ name: 1 }` unique, case-insensitive.

Notes:
- A flat list in the MVP. Subcategories are a Phase 8 extra.
- A category that still has products cannot be hard-deleted (`409`); deactivate it instead.

### 2.4 Product (`products`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `title` | String | yes | trimmed | |
| `slug` | String | yes | **unique**, server-generated | detail by slug |
| `description` | String | yes | | |
| `categoryId` | ObjectId -> Category | yes | must be active | |
| `images` | [String] | no | valid URLs, max 10 | no upload yet |
| `attributes` | [{ name, value }] | no | | for display only |
| `isActive` | Boolean | yes | default `true` | |

Indexes: `{ slug: 1 }` unique; `{ categoryId: 1, isActive: 1 }`; a search index chosen in P3-T07.

Notes:
- **No price and no stock here.** Both belong to each Variant, because every size/color is its own SKU (EC-02).
- The listing gets the price range and in-stock flag from the variants (see 3.1).

### 2.5 Variant (`variants`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `productId` | ObjectId -> Product | yes | | |
| `sku` | String | yes | **unique** across all products, uppercase, immutable | used by orders, reports, audit |
| `size` | String | no | | |
| `color` | String | no | | |
| `price` | Number | yes | integer piasters, `> 0` | changes are audited |
| `stock` | Number | yes | integer, `>= 0`, default `0` | changed only by adjustments or orders |
| `initialStockSet` | Boolean | yes | default `false` | `true` after the one `initial_stock` adjustment |
| `isActive` | Boolean | yes | default `true` | |

Indexes: `{ sku: 1 }` unique; `{ productId: 1, size: 1, color: 1 }` unique; `{ productId: 1, isActive: 1 }`.

Notes:
- One document per SKU, in its own collection (see 3.1).
- `stock` is never sent by the client. It changes only through atomic conditional updates.
- Missing `size` / `color` index as `null`, so a product can have only one variant without size and color.

### 2.6 ShippingZone (`shippingzones`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `name` | String | yes | **unique** | |
| `governorates` | [String] | yes | non-empty, from the shared constant, no duplicates in the list | |
| `fee` | Number | yes | integer piasters, `>= 0` | changes are audited |
| `isActive` | Boolean | yes | default `true` | |

Indexes: `{ name: 1 }` unique; `{ governorates: 1 }` unique, partial on `isActive: true`.

Notes:
- A governorate belongs to at most one active zone. The partial unique index guarantees this, even when two requests arrive at once.
- A governorate in no active zone means "no delivery there".

### 2.7 Cart (`carts`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `userId` | ObjectId -> User | yes | **unique** | one cart per customer |
| `items` | [CartItem] | no | max lines from config | |
| `items.variantId` | ObjectId -> Variant | yes | variant and product must be active | |
| `items.quantity` | Number | yes | integer, `1` .. max per line | |
| `items.addedAt` | Date | yes | default now | |

Indexes: `{ userId: 1 }` unique.

Notes:
- **No price is stored.** The quote and the order always read current prices from the Variant, so the cart never holds a stale or client-supplied price.
- The stock check when adding to the cart is only a friendly check. The real guarantee is in order creation (P5-T02).

### 2.8 Coupon (`coupons`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `code` | String | yes | **unique**, uppercase, trimmed | |
| `type` | String | yes | enum `percent`, `fixed` | |
| `value` | Number | yes | percent: `1`..`100`; fixed: integer piasters `> 0` | |
| `maxDiscount` | Number | no | integer piasters, percent only | |
| `minSubtotal` | Number | yes | integer piasters, default `0` | |
| `startsAt` | Date | yes | | |
| `expiresAt` | Date | yes | after `startsAt` | |
| `usageLimit` | Number | no | integer `> 0`; missing = unlimited | global limit |
| `usedCount` | Number | yes | integer, default `0`, server-managed | |
| `isActive` | Boolean | yes | default `true` | |

Indexes: `{ code: 1 }` unique.

Notes:
- `usedCount` goes +1 inside the order transaction and -1 when that order is cancelled. It never goes above `usageLimit`.
- The discount applies to the subtotal only, never to shipping. A per-user limit is deferred.

### 2.9 Order (`orders`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `orderNumber` | String | yes | **unique**, human-readable | separate from `_id`; generated in P5-T01 |
| `userId` | ObjectId -> User | yes | | ownership |
| `items` | [OrderItem] | yes | at least 1 | snapshots, see table below |
| `shippingAddress` | object | yes | copy of the address fields | snapshot |
| `coupon` | object | no | `couponId`, `code`, `type`, `value`, `maxDiscount` | snapshot |
| `subtotal` | Number | yes | integer piasters `>= 0` | |
| `discount` | Number | yes | integer piasters, `0` .. `subtotal` | |
| `shippingZoneName` | String | yes | | snapshot only; the Order keeps **no** reference to the zone, so editing or deleting a zone cannot affect it |
| `shippingFee` | Number | yes | integer piasters `>= 0` | snapshot |
| `total` | Number | yes | integer piasters `>= 0` | equals the quote total |
| `currency` | String | yes | `EGP` | |
| `status` | String | yes | `pending`, `accepted`, `packing`, `shipped`, `delivered`, `cancelled`; default `pending` | transitions in [order-state-machine.md](order-state-machine.md) |
| `paymentMethod` | String | yes | `cod` | |
| `paymentStatus` | String | yes | `pending`, `paid`, `voided`; default `pending` | transitions in [order-state-machine.md](order-state-machine.md) |
| `paidAt` / `paidById` | Date / ObjectId -> User | no | | set at COD confirmation |
| `carrier` / `trackingNote` | String | no | | set on `shipped` |
| `shippedAt` / `deliveredAt` | Date | no | | |
| `cancelledAt` / `cancelledById` / `cancelledByRole` / `cancellationReason` | Date / ObjectId / String / String | no | | customer or staff |
| `statusHistory` | [{ status, at, byId, byRole, note }] | yes | append-only, at least 1 entry | |

**OrderItem (embedded in `orders.items`)**

| Field | Type | Req | Notes |
|---|---|---|---|
| `productId` | ObjectId -> Product | yes | for links only |
| `variantId` | ObjectId -> Variant | yes | to restore stock on cancel |
| `sku` | String | yes | snapshot |
| `title` | String | yes | snapshot |
| `size` / `color` | String | no | snapshot |
| `unitPrice` | Number | yes | snapshot, integer piasters |
| `quantity` | Number | yes | integer `> 0` |
| `lineTotal` | Number | yes | `unitPrice x quantity` |

Indexes: `{ orderNumber: 1 }` unique; `{ userId: 1, createdAt: -1 }`; `{ status: 1, createdAt: -1 }`.

Notes:
- The final, frozen record of a sale. Later changes to products, prices, addresses or coupons never change it (see section 4).
- There is no separate Shipment entity. The shipment fields and `statusHistory` live here.
- Every status change is a conditional update on the current status.

### 2.10 ReturnRequest (`returnrequests`, stretch, Phase 7)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `orderId` | ObjectId -> Order | yes | order must be `delivered`, inside the return window | |
| `userId` | ObjectId -> User | yes | order owner | |
| `items` | [{ variantId, sku, quantity }] | yes | subset of the order's items | |
| `reason` | String | yes | | |
| `status` | String | yes | `requested`, `approved`, `rejected`, `received`; default `requested` | |
| `refundStatus` | String | yes | `not_required`, `pending`, `refunded_manually` | separate from `status` |
| `history` | [{ status, at, byId }] | yes | append-only | |

Indexes: `{ orderId: 1, status: 1 }`.

Notes:
- A separate collection, so a return never overwrites the order's payment status or history.
- No automatic restock. Staff use an inventory adjustment if the goods go back to stock.

### 2.11 AuditLog (`auditlogs`)

| Field | Type | Req | Constraints / default | Notes |
|---|---|---|---|---|
| `actorId` | ObjectId -> User | yes | | |
| `actorRole` | String | yes | | role at the time of the action |
| `action` | String | yes | fixed list, for example `inventory.adjusted`, `stock.deducted_by_order`, `stock.restored_by_cancellation`, `order.status_changed`, `order.payment_status_changed`, `variant.price_changed`, `user.role_changed` | |
| `entityType` | String | yes | `variant`, `order`, `coupon`, `user`, `shipping_zone`, ... | |
| `entityId` | ObjectId | yes | | |
| `changes` | object | no | before / after of changed fields | |
| `reason` | String | no | required for `inventory.adjusted` (fixed list in 3.4); not used for order-driven stock actions | |
| `metadata` | object | no | for example stock change and note | |

Indexes: `{ entityType: 1, entityId: 1, createdAt: -1 }`; `{ actorId: 1, createdAt: -1 }`; `{ action: 1, createdAt: -1 }`.

Notes:
- Append-only: no update or delete. It covers prices, stock, coupons, shipping fees, roles, and order/payment status.
- Inventory adjustments are stored here and have no collection of their own (see 3.4).
- The collection grows without limit, which is fine because every entry is its own document.

## 3. Decisions

### 3.1 Variants: separate collection, one document per SKU
- **Atomic stock on one SKU.** An order line or adjustment is one conditional update on one Variant document (filter by `_id` and "enough stock", then increment). Single-document writes are atomic in MongoDB, and no other SKU's document is touched. Brief scenario 01 becomes obvious: buying variant A changes only A's document.
- **Uniqueness the database really enforces.** MongoDB enforces a unique index *across separate documents*. If variants were an embedded array, a unique index on `variants.sku` would not stop one product from having the same SKU twice in its own array (MongoDB Manual, "Unique Constraint Across Separate Documents"). As separate documents, `{ sku }` unique and `{ product, size, color }` unique are both real guarantees. A product with a single variant and no size/color can still have only one such variant, because missing fields index as `null`.
- **Direct references.** Cart items and order items point straight at a Variant `_id`, with no "find the product, then the array element" step.
- **Document size and contention.** The product document stays small, and frequent stock writes do not rewrite or lock a large product document.
- **Cost (accepted):** the product listing and detail need a second query or a `$lookup` to get the price range and the in-stock flag, and creating a product with variants writes to two collections. If listing becomes slow, a denormalized `priceMin` / `priceMax` on the Product can be added later, updated whenever a variant price changes. Not done now.

### 3.2 Addresses: embedded array in User
- **Bounded and owned.** A user has a few addresses (max 10). They are always read together with the user and never shared between users. This is the textbook case for embedding.
- **Ownership for free.** Every address lookup and update is filtered by the user from the token (`_id = me` and `addresses._id = addressId`). Another user's address simply is not found, which gives the `404` rule without an extra ownership check.
- **One atomic write.** Changing the default (unset the old one, set the new one) happens in a single document update.
- **Orders are safe.** The Order copies the address (`shippingAddress` snapshot), so editing or deleting an address later never changes an old order.
- **Cost (accepted):** no global query such as "all addresses in Giza" without scanning users. The MVP does not need one.

### 3.3 Roles: one `role` string field
- Values: `admin`, `catalog_manager`, `order_operator`, `customer`; default `customer`. Register always creates `customer`; only an admin changes roles.
- **Why one field:** the brief gives every user exactly one role, and a single enum makes the authorization check a simple "role in allowed list". An array of roles or a separate Role/Permission collection solves a problem the MVP does not have (combined roles, editable permissions).
- **Freshness:** the auth middleware already loads the user (to check `isActive` and `passwordChangedAt`), so authorization uses the role **from the database**, not a role copied into the token. A demotion or deactivation takes effect on the next request.
- **At least one active admin:** checked in the service with the `{ role, isActive }` index before any demotion or deactivation of an admin.

### 3.4 Inventory adjustments: no separate collection, written to the AuditLog
- Each adjustment is one AuditLog entry with `action: "inventory.adjusted"`, `entityType: "variant"`, `entityId`, `reason` (`initial_stock`, `restock`, `damaged`, `lost`, `correction`), and `changes` / `metadata` holding the signed change, the before/after stock, and the optional note.
- This section covers **manual** adjustments only. Stock changed by an order (deduct on create, restore on cancel) is also audited, under separate actions that carry the `orderId` (see section 5.2).
- **Why:** an adjustment record has the same shape as an audit entry (actor, entity, before/after, reason, time), and the decision "every adjustment is written to the audit log" already exists. A second collection would store the same facts twice and could drift.
- **The `initial_stock` rule is enforced on the Variant, not by reading the log.** Checking the log first and then writing is read-then-write, and two concurrent requests could both pass. Instead, `initialStockSet` on the Variant is flipped from `false` to `true` in the same conditional update that adds the stock, so only one request can succeed.
- **Cost (accepted):** stock-history reports query `auditlogs` filtered by `entityType` / `entityId` / `action`. The indexes cover this.

## 4. Snapshots on the Order

| Field | Why it is a snapshot (what goes wrong without it) |
|---|---|
| `items[].unitPrice`, `lineTotal` | A later price change would change what the customer was charged, and the stored total would no longer match the quote (brief scenario 02). |
| `items[].title`, `size`, `color` | A renamed or deactivated product would rewrite or break the order history. |
| `items[].sku` | Reports and support need the SKU that was sold, even if the variant is later deactivated. |
| `shippingAddress` (all fields) | Editing or deleting the address in the profile would change where an old order was delivered. |
| `shippingZoneName`, `shippingFee` | (no reference to the zone is kept) A fee change on the zone would change an old order's total. |
| `coupon` (code, type, value, cap) | Editing or deactivating the coupon would make the discount impossible to explain. |
| `subtotal`, `discount`, `total`, `currency` | The order total must stay exactly what was quoted and agreed. |

References kept next to the snapshots, for actions only: `items[].variantId` (restore stock on cancel), `items[].productId` (link to the product page), `coupon.couponId` (release usage on cancel), `userId` (ownership).

**Scenario 02 on this model:** the quote and the order use the same pricing service. The order stores `subtotal`, `discount`, `shippingFee` and `total` along with the snapshots they were computed from, so anyone can recompute `sum(items.lineTotal) - discount + shippingFee = total` from the order alone, even after prices change.

## 5. Invariants and where they are enforced

### 5.1 In the schema and indexes (the database is the last line of defence)

| Invariant | Where |
|---|---|
| Email unique | unique index `users.email` (stored lowercase) |
| SKU unique across all products | unique index `variants.sku` (stored uppercase) |
| size+color unique inside one product | unique index `variants { productId, size, color }` |
| Coupon code unique | unique index `coupons.code` (stored uppercase) |
| One cart per customer | unique index `carts.userId` |
| `orderNumber` unique | unique index `orders.orderNumber` |
| A governorate in at most one active zone | unique partial index on `shippingzones.governorates` for `isActive: true`. To be tested on Atlas in P4-T01. Duplicates inside one zone's own list are rejected by Zod, because a unique index does not prevent duplicates inside one document. |
| Only known values for fixed sets | enums: `role`, order `status`, `paymentMethod`, `paymentStatus`, coupon `type`, return `status` and `refundStatus` |
| Money is integer piasters, never negative | schema (integer validator, `min: 0`) and Zod at the edge; variant `price` is `> 0` |
| `variants.stock >= 0` | schema `min: 0`. This is only a backstop, see 5.2 (stock deduction). |
| Order item `quantity` is an integer `>= 1`; order items are non-empty | schema validators on `orders.items` |
| An order / cart belongs to exactly one user | required `userId` reference |
| Snapshot fields on the Order are immutable | schema `immutable: true` on the snapshot fields. Mongoose blocks changes to immutable paths on `save()` and, in strict mode, on query updates such as `updateOne` / `findOneAndUpdate` (Mongoose docs, "Timestamps" and "SchemaTypes"). The native driver bypasses it, and the behaviour on paths inside `items[]` is to be confirmed in P5-T01. |
| Return request never overwrites the order's payment status | separate collection and separate `refundStatus` |

### 5.2 In services and transactions (rules a schema cannot express)

| Invariant | Where |
|---|---|
| Stock never negative; no order takes more than the available stock | **one conditional atomic update per variant** (filter `stock >= n`, then decrement), inside the order transaction (P5-T02). Mongoose update validators are off by default and do not run on `$inc` (Mongoose docs, "Validation", "Update Validators Only Run For Some Operations"), so the filter is the real guarantee, not `min: 0`. |
| Order creation is all-or-nothing | one transaction: create the order, deduct stock, increase coupon `usedCount`, clear the cart |
| Coupon `usedCount` never above `usageLimit` | conditional atomic update (`usedCount < usageLimit`) inside the order transaction. The quote only does a friendly read. |
| Totals are recomputed on the server; order total = quote total | one pricing service for quote and order; an `expectedTotal` mismatch is rejected (P5-T01) |
| Total never goes negative | `discount <= subtotal`, checked in the pricing service |
| A line is purchasable only if variant, product and category are all active | checked in cart, quote and order creation |
| Order status moves only along allowed transitions | conditional update on the current status plus a `statusHistory` entry (state machine in [order-state-machine.md](order-state-machine.md)) |
| Status history and audit log are append-only | service code (`$push` only, no update or delete endpoints) |
| Every stock change writes one audit entry | the audit log is the stock ledger. Manual changes use `inventory.adjusted` with a `reason` from the fixed list. Changes caused by orders use their own actions (`stock.deducted_by_order`, `stock.restored_by_cancellation`), carry the `orderId` in `metadata`, and need no `reason`. Whether the audit write is inside the transaction is decided in P5-T02. |
| `initial_stock` only once per variant | `initialStockSet` flag flipped in the same conditional atomic update that adds the stock |
| Ownership | the user id always comes from the verified token; another user's resource answers `404` |
| At least one active admin always exists; an admin cannot demote or deactivate themselves | service check before demote / deactivate |
| One default address; maximum address count (10) | service rule in the address operations |
| One cart line per variant | conditional update on the cart (add quantity to the existing line) |
| Return window after `deliveredAt`; return quantity not above what was bought | service check when creating a return request |

## 6. Arrays: bounded or not

| Array | Bound |
|---|---|
| `user.addresses` | max 10 |
| `product.images` | max 10 |
| `cart.items` | max lines from config |
| `order.items` | same cap (copied from the cart) |
| `order.statusHistory` | bounded by the state machine (about 6 entries) |
| `shippingZone.governorates` | at most 27 (the number of Egyptian governorates) |
| `returnRequest.items`, `history` | bounded by the order's items and the return states |

Nothing in the model grows without limit inside one document. The two collections that grow forever, `orders` and `auditlogs`, hold one document per event.
