# Tasks index

Tasks come from `../source/internship-brief.md`, filtered through `../01-scope.md` and `../02-decisions.md`. One task is sized for one focused session (1 to 1.5 hours). Work them in order; a task never needs something a later task builds.

Work loop per task: `/plan-task` (bring your own plan) -> code -> `/hint` when stuck -> `/review-task` until "Ready" -> tick the box.

## Conventions used in every task
These apply to every task, so the task files do not repeat them.

- **Base path:** `/api/v1`. Staff-only routes live under `/api/v1/admin/...`. Paths in tasks are contracts; small renames are fine if agreed in `/plan-task` and kept consistent.
- **Roles:** `admin`, `catalog_manager`, `order_operator`, `customer`. "Staff" means the first three. How roles are stored is decided in P1-T08 (ERD) and implemented in P2-T01.
- **Status codes:** `400` invalid input; `401` no token (or an invalid/expired one); `403` wrong role; `404` someone else's resource, or not found (never reveal that another user's resource exists); `409` conflict (duplicate, wrong state, not enough stock); `429` rate limited. Every protected task lists the `401` / `403` / `404` cases that apply in its acceptance criteria.
- **Customer-only endpoints** (cart, quote, orders, returns, reviews, wishlist): staff get `403`.
- **Stock:** new variants start at `0`. Stock changes only through inventory adjustments (first one with reason `initial_stock`) or orders.
- **Error and success shape:** decided in P1-T05 and used everywhere after it.
- **Money:** integer piasters (EGP x 100). **Dates:** stored UTC, returned ISO 8601.
- **Lists:** every list endpoint is paginated using the convention set in P2-T05.
- **Audit log:** from P2-T10 on, any change to prices, stock, coupons, shipping fees, roles, or order/payment status writes an audit entry.
- **Postman:** every task adds its requests (including the failure cases) to the collection, using environment variables for the base URL and tokens. No secrets in exported files.
- **Failure cases to check on every protected endpoint:** no token, wrong role, someone else's resource, invalid input, not found.

## Phase 1: Foundation (`phase-1-foundation.md`)
| | ID | Task | Depends on |
|---|---|---|---|
| [x] | P1-T01 | Project setup and folder structure | none |
| [x] | P1-T02 | Linting and formatting | P1-T01 |
| [x] | P1-T03 | Configuration module | P1-T01 |
| [x] | P1-T04 | Database connection (Atlas) | P1-T03 |
| [x] | P1-T05 | Error handling and response shape | P1-T01 |
| [x] | P1-T06 | Request validation with Zod | P1-T05 |
| [x] | P1-T07 | Security and logging middleware | P1-T03, P1-T05 |
| [x] | P1-T08 | Data design: ERD | none (do before Phase 2 code) |
| [ ] | P1-T09 | Data design: order and payment state diagrams | P1-T08 |

## Phase 2: Auth and users (`phase-2-auth-and-users.md`)
| | ID | Task | Depends on |
|---|---|---|---|
| [ ] | P2-T01 | User model | P1-T04, P1-T08 |
| [ ] | P2-T02 | Register | P2-T01, P1-T06 |
| [ ] | P2-T03 | Login and authentication middleware | P2-T02 |
| [ ] | P2-T04 | Role authorization and first-admin seed | P2-T03 |
| [ ] | P2-T05 | Staff management and the pagination convention | P2-T04 |
| [ ] | P2-T06 | Own profile and password change | P2-T03 |
| [ ] | P2-T07 | Email setup and forgot password | P2-T03 |
| [ ] | P2-T08 | Reset password and auth rate limiting | P2-T07 |
| [ ] | P2-T09 | Delivery addresses | P2-T03 |
| [ ] | P2-T10 | Audit log module | P2-T05 |

## Phase 3: Catalog (`phase-3-catalog.md`)
| | ID | Task | Depends on |
|---|---|---|---|
| [ ] | P3-T01 | Categories | P2-T10 |
| [ ] | P3-T02 | Product and variant model, create product | P3-T01 |
| [ ] | P3-T03 | Update and deactivate products | P3-T02 |
| [ ] | P3-T04 | Variant management | P3-T02 |
| [ ] | P3-T05 | Inventory adjustments (including initial stock) | P3-T04 |
| [ ] | P3-T06 | Public product listing: filter, sort, paginate | P3-T04 |
| [ ] | P3-T07 | Product search | P3-T06 |
| [ ] | P3-T08 | Product detail by slug and staff product list | P3-T06 |

## Phase 4: Cart, shipping, coupons, quote (`phase-4-cart-and-pricing.md`)
| | ID | Task | Depends on |
|---|---|---|---|
| [ ] | P4-T01 | Shipping zones | P2-T09, P2-T10 |
| [ ] | P4-T02 | Cart: add item and view cart | P3-T08 |
| [ ] | P4-T03 | Cart: update, remove, clear, stale items | P4-T02 |
| [ ] | P4-T04 | Coupons (admin CRUD) | P2-T10 |
| [ ] | P4-T05 | Pricing service and checkout quote (no coupon) | P4-T01, P4-T03 |
| [ ] | P4-T06 | Coupon application in the quote | P4-T04, P4-T05 |

## Phase 5: Orders and stock (`phase-5-orders-and-stock.md`)
| | ID | Task | Depends on |
|---|---|---|---|
| [ ] | P5-T01 | Order model and place order (snapshots, no stock yet) | P4-T06, P1-T09 |
| [ ] | P5-T02 | Transactional order creation with atomic stock and coupon usage | P5-T01 |
| [ ] | P5-T03 | Concurrency verification script | P5-T02 |
| [ ] | P5-T04 | Customer order history | P5-T01 |
| [ ] | P5-T05 | Customer cancellation | P5-T02 |

## Phase 6: Fulfilment and admin operations (`phase-6-fulfilment.md`)
| | ID | Task | Depends on |
|---|---|---|---|
| [ ] | P6-T01 | Admin order queue | P5-T04 |
| [ ] | P6-T02 | Order status transitions | P6-T01 |
| [ ] | P6-T03 | COD payment confirmation | P6-T02 |
| [ ] | P6-T04 | Staff cancellation | P6-T02, P5-T05 |
| [ ] | P6-T05 | Permissions matrix and role walkthrough | P6-T04 |

## Phase 7: Stretch and polish (`phase-7-stretch-and-polish.md`)
| | ID | Task | Depends on |
|---|---|---|---|
| [ ] | P7-T01 | Order emails | P6-T04, P2-T07 |
| [ ] | P7-T02 | Sales summary report | P6-T03 |
| [ ] | P7-T03 | Low-stock report | P3-T05 |
| [ ] | P7-T04 | Return requests (recording only) | P6-T03 |
| [ ] | P7-T05 | Full seed script | P6-T05 |
| [ ] | P7-T06 | README, final ERD, Postman export | P7-T05 |

## Phase 8: Optional extras (`phase-8-optional-extras.md`)
Only after Phase 6 is done. Each one is independent.
| | ID | Task | Depends on |
|---|---|---|---|
| [ ] | P8-T01 | Brands | P3-T08 |
| [ ] | P8-T02 | Subcategories | P3-T08 |
| [ ] | P8-T03 | Reviews and ratings | P6-T02 |
| [ ] | P8-T04 | Wishlist | P3-T08 |

## Deferred (post-MVP)
Do not plan or build these until they have been studied and brought back in:
- Online payment gateway (Paymob or Fawry), payment attempts, provider integration (EC-09 online methods, EC-10).
- Payment webhooks: signature verification, idempotency, retries, payment recovery (EC-11, section 09 scenarios 03-05).
- Provider refunds (EC-13 refund part).
- Stock reservation with expiry and its scheduled job.
- File upload: Multer, Sharp, cloud storage.
- Automated tests (unit, integration, e2e).
- Swagger / OpenAPI docs.
- Guest carts. Per-user coupon usage limit. Tax.

Out of scope entirely: AI shopping chat (EC-14, EC-AI-*), mobile and web UI (EC-15, section 08), Docker, HTTPS and backups.
