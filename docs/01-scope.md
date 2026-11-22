# Scope

This file **overrides** the brief wherever they differ. Scope rule: the MVP contains what the learner has already studied plus what they can pick up lightly. Anything they have not studied yet is deferred and revisited after the MVP.

## 1. Feature decisions (brief IDs)

| ID | Feature | Decision | Notes |
|---|---|---|---|
| EC-01 | Catalog / categories | **MVP** | CRUD for categories and products. Images are stored as an array of URL strings for now (no upload). |
| EC-02 | Variants / stock | **MVP** | Each size/color combination is a unique SKU with its own stock. The data-model choice is the learner's. |
| EC-03 | Discovery | **MVP** | Search, category filter, sorting, pagination, product detail by slug. |
| EC-04 | Cart | **MVP** | Add / update / remove, quantity validation, subtotal. Logged-in users only (guest cart is a proposal, see section 5). |
| EC-05 | Account / address | **MVP** | Register, login, contact number, multiple delivery addresses. Plus the repo extras below. |
| EC-06 | Checkout | **MVP** | Server-side quote: prices, coupon, shipping, final amount. Shipping is configured by zone or flat rate. Tax is not implemented. |
| EC-07 | Order / inventory | **MVP** | Unique order with line-item snapshots. Prevent overselling with atomic stock deduction at order creation. |
| EC-08 | Discounts | **MVP** | One basic coupon type (percent or fixed) with validity and usage rules. Totals can never go negative. |
| EC-09 | Payment methods | **MVP, Cash on Delivery only** | Online methods are deferred. The Order carries `paymentMethod` and `paymentStatus` so a gateway can be added later. |
| EC-10 | Provider integration | **Deferred** | Needs the payment gateway. |
| EC-11 | Payment webhooks | **Deferred** | Signature verification, idempotency. Not studied yet. |
| EC-12 | Order fulfilment | **MVP** | Admin order queue. Status flow accepted -> packing -> shipped -> delivered with permitted cancellation paths. |
| EC-13 | Returns / refunds | **Stretch (last phase)** | Basic return-request recording only. Provider refunds are deferred. |
| EC-14 | AI shopping chat | **Out** | Not backend-learning scope. Also all `EC-AI-*` items and brief sections 12-14. |
| EC-15 | Customer mobile | **Out** | Backend only. |
| EC-16 | Notifications / reports | **Stretch (last phase)** | Order-confirmation and status emails via Resend, and a simple dashboard (revenue, order count, low stock). |

## 2. Other parts of the brief

| Brief part | Decision |
|---|---|
| Section 02 roles and authorization | **MVP.** Roles: admin, catalog manager, order operator, customer. Ownership checks on every request. Authentication is separate from permissions. |
| Audit log (financial / inventory changes with user and timestamp) | **MVP, late phase.** A collection that records who changed what and when. |
| Section 06 business invariants | **MVP**, except the payment-related ones (payment attempts, provider event deduplication, payment verification), which are deferred. |
| Section 07 architecture | **Modular monolith.** Stack changed to Express 5 + MongoDB/Mongoose + Zod (see `02-decisions.md`). The brief's PostgreSQL / NestJS suggestions do not apply. |
| Section 08 interface requirements | **Out** (no UI). Keep the shared expectations that affect the API: clear validation messages, human-readable status labels, unique order references, EGP currency, Africa/Cairo display time. |
| Section 09 non-functional | **Stock safety**: in. **Operational basics** (validation, secure secrets, rate limiting, audit logs): in. **Webhook trust / retries / payment recovery**: deferred. **Chat accuracy**: out. HTTPS and backups are deployment concerns: out. |
| Section 09 mentor scenarios | **01** (variants, separate stock) and **02** (coupon, quote equals stored total): in. **03-05** (payment and webhooks): deferred. **06** (chatbot): out. |
| Sections 10-11 delivery plan, demo, rubric | Not applicable (solo learning, no deadline). Keep the useful parts: seed script, README, ERD, Postman collection. |

## 3. Extras taken from the Index Academy repo
Not in the brief, added to the plan:
- **Forgot / reset password** (email sent with Resend).
- **Centralized error handling** as an explicit task (the brief only asks for consistent error messages).
- **Optional, after the core phases:** Brands, Subcategories, Reviews and ratings, Wishlist.

Deferred repo topic: image upload with Multer and Sharp.

## 4. Deferred (post-MVP, once the learner has studied them)
Payment gateway integration, webhooks and signature verification, payment attempts, file upload (Multer, Sharp, cloud storage), automated tests, Swagger/OpenAPI, stock reservation with expiry and its scheduled job, provider refunds.

## 5. Proposals to confirm in the Understand step
These are suggestions that the learner has not explicitly decided yet:
- Guest (not logged-in) carts are deferred. Logged-in carts only.
- Tax is not implemented.
- Basic returns are a stretch item in the last phase.

## 6. Template leftovers in the brief (ignore)
The brief contains wording from a reused template that does not apply here: branch-scoped roles, "customer/parent" access, "timetable" changes, "bookings", enrollment, and "student, parent or delivery experience". Ignore them.

## 7. Suggested phase order
The assistant may adjust this with reasoning.
1. **Foundation:** folder structure, config, database connection, centralized error handling, response shape, logging, security middleware.
2. **Auth and users:** register, login, roles, ownership middleware, forgot / reset password, addresses.
3. **Catalog:** categories, products, variants with SKU and stock, search / filter / sort / pagination.
4. **Cart and coupons:** cart, coupon rules, checkout quote.
5. **Orders and stock:** order creation with snapshots, atomic stock deduction, Cash on Delivery, cancellation.
6. **Fulfilment and admin operations:** order queue, status transitions, shipment status, audit log, staff roles in practice.
7. **Extras and polish:** optional repo extras, returns, emails and reports, seed script, README, ERD, Postman collection.
