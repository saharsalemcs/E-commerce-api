# Phase 8: Optional extras

Optional, after Phase 6 is "Ready". Taken from the Index Academy repo (`01-scope.md` section 3), not from the brief. Each task is independent; pick any order.

---

### P8-T01 Brands

**Goal:** Products can belong to a brand, and shoppers can filter by brand.
**Source:** Repo extra: Brands.
**Depends on:** P3-T08.

**Scope**
- Endpoints: `GET /api/v1/brands`, `GET /api/v1/brands/:slug` (public, active only); `POST`, `PATCH`, deactivate under `/api/v1/admin/brands` (admin, catalog manager).
- Data: name (unique, case-insensitive), slug, logo URL (optional), active flag.
- Product gets an optional brand ref; `GET /products` gets a `brand` filter (slug).
- Business rules: a brand with products cannot be hard-deleted; inactive brands are hidden (decide what happens to their products in public lists).

**Acceptance criteria (verify in Postman)**
- Create brand, assign to a product, filter `brand=<slug>` -> only its products.
- Duplicate name -> `409`. Unknown brand id -> `404`.
- Admin endpoints: no token -> `401`; customer or order operator -> `403`.

**Concepts to review:** adding a field and filter without breaking existing clients.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P8-T02 Subcategories

**Goal:** Categories can have subcategories, and products can be filtered by them.
**Source:** Repo extra: Subcategories.
**Depends on:** P3-T08.

**Scope**
- Decide the model: a separate Subcategory collection with a parent category ref, or a `parent` field on Category (one level only). Compare and choose.
- Endpoints: public list of subcategories of a category; staff CRUD (admin, catalog manager).
- Product gets an optional subcategory, which must belong to the product's category.
- `GET /products` gets a `subcategory` filter.

**Acceptance criteria (verify in Postman)**
- Subcategory from another category on a product -> `400`/`409`.
- Filter by subcategory -> correct products.
- Deactivated parent category -> its subcategories are hidden.
- Staff endpoints: no token -> `401`; customer or order operator -> `403`; unknown subcategory id -> `404`.

**Concepts to review:** tree modeling in MongoDB (parent references); keeping cross-entity consistency.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P8-T03 Reviews and ratings

**Goal:** Customers who received a product can review it once; products show an average rating.
**Source:** Repo extra: Reviews and ratings.
**Depends on:** P6-T02.

**Scope**
- Endpoints: `GET /api/v1/products/:slug/reviews` (public, paginated); `POST /api/v1/products/:id/reviews`, `PATCH`/`DELETE` own review (customer); `DELETE /api/v1/admin/reviews/:id` (admin) for moderation.
- Data: product, user, rating (integer 1 to 5), comment (length limit), timestamps. Unique (product, user).
- Business rules: only a customer with a **delivered** order containing that product may review; the product's average rating and count are updated when reviews are created, changed, or deleted (decide how: recompute with aggregation, or incremental).

**Acceptance criteria (verify in Postman)**
- No delivered order with that product -> `403` (or `409`, documented).
- Second review by the same user -> `409`.
- Rating `0`, `6`, `4.5` -> `400`.
- Average and count are correct after create, update, and delete.
- Editing or deleting someone else's review -> `404`.
- Customer endpoints: no token -> `401`; staff token -> `403`.
- Admin moderation: no token -> `401`; catalog manager, order operator, or customer -> `403`.

**Concepts to review:** derived/denormalized fields and keeping them correct; Mongoose post hooks vs explicit service calls.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P8-T04 Wishlist

**Goal:** Customers save products to a wishlist.
**Source:** Repo extra: Wishlist.
**Depends on:** P3-T08.

**Scope**
- Endpoints (customer, own wishlist): `GET /api/v1/users/me/wishlist`, `POST /api/v1/users/me/wishlist` (product id), `DELETE /api/v1/users/me/wishlist/:productId`.
- Business rules: no duplicates; a maximum size; inactive products are shown as unavailable or hidden (choose); adding an inactive or unknown product -> rejected.
- Decide storage: array on the user or a separate collection. Justify with the maximum size in mind.

**Acceptance criteria (verify in Postman)**
- Add the same product twice -> stored once.
- Unknown product -> `404`. Above the maximum -> `409`.
- User A cannot see or change B's wishlist (the wishlist comes from the token; removing a product that is only in B's list -> `404`, B's list unchanged).
- No token -> `401`. Staff token -> `403`.

**Concepts to review:** `$addToSet` and `$pull`; bounded arrays.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".
