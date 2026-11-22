# Phase 2: Auth and users

Goal of the phase: accounts, authentication separate from authorization, staff management, password recovery by email, delivery addresses, and the audit log that every later phase writes to.

---

### P2-T01 User model

**Goal:** A User model that stores identity, contact, role, and a safely hashed password.
**Source:** EC-05; brief section 02 (roles).
**Depends on:** P1-T04, P1-T08.

**Scope**
- Data: name, email (unique, stored lowercase, trimmed), phone (Egyptian mobile format), password hash (never returned by default), role (one of the four roles, default `customer`; storage as decided in P1-T08), active flag, password-changed timestamp, timestamps.
- Indexes: unique email.
- Hashing: passwords are hashed before storage (`bcrypt` or `bcryptjs`; pick and say why). Decide where hashing happens (model hook or service) and justify it.
- A way to compare a candidate password with the hash.
- Decide the exact Egyptian phone rule (for example `01` + one of the operator digits + 8 digits) and document it.

**Not in this task:** any endpoint.

**Acceptance criteria**
- Create a user from a throwaway script or a temporary route: the stored document has a hash, not the plain password; the hash is not returned when reading the user normally. Remove the temporary route afterwards.
- A second user with the same email in different case -> duplicate key, mapped to `409` by your error handler.

**Concepts to review:** password hashing and salt rounds; Mongoose `select: false`; pre-save hooks vs service-level logic; unique indexes vs validation.

**Definition of done:** all acceptance criteria pass, database state is correct, and `/review-task` has returned "Ready".

---

### P2-T02 Register

**Goal:** Customers can create an account. The client can never choose its own role.
**Source:** EC-05; brief section 02 ("never trust IDs/roles supplied by the client").
**Depends on:** P2-T01, P1-T06.

**Scope**
- Endpoint: `POST /api/v1/auth/register` (public). Body: name, email, phone, password, password confirmation.
- Business rules: role is always `customer`; any `role` in the body is ignored or rejected (choose and be consistent with your strip/reject rule from P1-T06).
- Validation: password minimum length and confirmation match; email format; phone format.
- Response: the user (without password/hash) and an access token. Decide **token transport** (Authorization header or httpOnly cookie) and record it in `docs/02-decisions.md`.
- Config: JWT secret and expiry come from the config module.

**Not in this task:** login, protecting routes.

**Acceptance criteria (verify in Postman)**
- Valid body -> `201`, user without hash, token present. DB has role `customer`.
- Body with `"role": "admin"` -> user is still `customer` (or `400`, per your rule).
- Existing email -> `409`.
- Weak password, mismatched confirmation, bad phone -> `400` naming the field.

**Concepts to review:** JWT structure, signing, expiry; header vs cookie trade-offs (XSS, CSRF); mass-assignment.

**Definition of done:** all acceptance criteria pass in Postman, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P2-T03 Login and authentication middleware

**Goal:** Users log in and receive a token; protected routes verify it and load the current user.
**Source:** EC-05; brief section 02 ("separate account authentication from business permissions").
**Depends on:** P2-T02.

**Scope**
- Endpoints: `POST /api/v1/auth/login` (public); `GET /api/v1/users/me` (any authenticated user).
- Business rules: wrong email and wrong password give the **same** error message; inactive users cannot log in.
- Authentication middleware: rejects missing, malformed, expired, or invalid tokens; rejects tokens for deleted or inactive users; rejects tokens issued before the last password change; attaches the user to the request.
- The user id used anywhere later comes from the verified token, never from the body or query.

**Not in this task:** roles (next task).

**Acceptance criteria (verify in Postman)**
- Correct credentials -> `200` and token; save it in the Postman environment with a test script.
- Wrong password and unknown email -> same `401` message.
- `GET /users/me` without token -> `401`; with a tampered token -> `401`; with a valid token -> `200`, no hash in the body.
- Deactivate the user in the DB -> the old token gets `401`.

**Concepts to review:** user enumeration; JWT verification errors (expired vs invalid); `iat` vs password-changed timestamp.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, and `/review-task` has returned "Ready".

---

### P2-T04 Role authorization and first-admin seed

**Goal:** A reusable authorization check by role, and a script that creates the first admin from environment values.
**Source:** Brief section 02 (roles); decisions "Staff and roles".
**Depends on:** P2-T03.

**Scope**
- Authorization middleware: given a list of allowed roles, rejects others with `403`. Always runs after authentication.
- Seed script in `scripts/`: creates the first admin using credentials from env (read **through the config module**, not `process.env`). Running it twice must not create a second admin or crash (idempotent). Add the new keys to `.env.example`.
- An npm script to run it.

**Not in this task:** staff management endpoints.

**Acceptance criteria (verify in Postman)**
- Run the seed -> admin exists; run it again -> clear message, no duplicate.
- A temporary admin-only route: customer token -> `403`; no token -> `401`; admin token -> `200`. Remove the route afterwards.

**Concepts to review:** authentication vs authorization; middleware composition; idempotent scripts.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, and `/review-task` has returned "Ready".

---

### P2-T05 Staff management and the pagination convention

**Goal:** The admin creates staff accounts, changes roles, and lists users. This task sets the pagination convention for every list endpoint.
**Source:** Brief section 02 (admin manages staff); decisions "Staff and roles"; brief section 07 ("paginated list endpoints").
**Depends on:** P2-T04.

**Scope**
- Endpoints (admin only):
  - `POST /api/v1/admin/users`: create a staff user (`catalog_manager`, `order_operator`, or `admin`).
  - `GET /api/v1/admin/users`: paginated list, filter by role, search by email.
  - `PATCH /api/v1/admin/users/:id/role`: change a user's role.
  - `PATCH /api/v1/admin/users/:id/status`: activate or deactivate a user.
- Pagination convention (document it in `docs/02-decisions.md`): query params (`page`, `limit`), a default and a maximum limit, and the meta returned (for example total, page, limit, total pages). Build it as a shared helper because every list after this uses it.
- Business rules: an admin cannot demote or deactivate themselves (prevents lockout); there is always at least one active admin.

**Not in this task:** audit logging of role changes (added in P2-T10).

**Acceptance criteria (verify in Postman)**
- Admin creates an order operator -> `201`; that user can log in.
- No token -> `401`. Catalog manager, order operator, or customer calls any of these -> `403`.
- `limit=1000` -> capped at your maximum; `page=0` or `limit=abc` -> `400`.
- Admin demotes self -> `409` (or `400`, documented).
- Unknown user id -> `404`; malformed id -> `400`.

**Concepts to review:** offset pagination with `skip`/`limit` and its cost; counting documents; least privilege.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P2-T06 Own profile and password change

**Goal:** Users update their own name and phone, and change their password safely.
**Source:** EC-05 ("manage contact number").
**Depends on:** P2-T03.

**Scope**
- Endpoints (any authenticated user):
  - `PATCH /api/v1/users/me`: update name and phone only.
  - `PATCH /api/v1/users/me/password`: current password, new password, confirmation.
- Business rules: `PATCH /users/me` must reject or ignore role, email, password, active flag. Password change requires the current password, updates the password-changed timestamp, and returns a fresh token; older tokens stop working.

**Not in this task:** email change (not in MVP), forgot password.

**Acceptance criteria (verify in Postman)**
- Update phone -> `200`, DB updated.
- Body with `role: "admin"` -> role unchanged (or `400`).
- Wrong current password -> `401` (or `400`, documented).
- After a password change, the old token -> `401`; the new token -> `200`.
- No token on either endpoint -> `401`.

**Concepts to review:** allow-listing updatable fields; token invalidation without a server-side session.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P2-T07 Email setup and forgot password

**Goal:** Set up Resend and let a user request a password-reset email without revealing whether the email is registered.
**Source:** Repo extra: forgot / reset password; decision "Email: Resend".
**Depends on:** P2-T03.

**Scope**
- Email service: one small module wrapping Resend, with the API key and sender from config. Other modules call your wrapper, not Resend directly.
- Endpoint: `POST /api/v1/auth/forgot-password` (public). Body: email.
- Business rules: always return the same success response whether or not the email exists. Generate a random reset token, store only its **hash** with a short expiry, email the plain token (as a link or code; choose and record the reset flow in `docs/02-decisions.md`). If sending fails, clear the stored token and return a generic error.
- Check in the Resend docs what you may send from a non-verified domain and to whom, and how its test addresses (for example `delivered@resend.dev`) work.

**Not in this task:** using the token (next task).

**Acceptance criteria (verify in Postman)**
- Existing email -> generic success, the email arrives (or shows in the Resend dashboard), DB holds a hashed token and expiry.
- Unknown email -> the same response, nothing stored.
- Invalid email format -> `400`.

**Concepts to review:** user enumeration; why reset tokens are stored hashed; Resend Node SDK "send email" (latest docs).

**Definition of done:** all acceptance criteria pass in Postman, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P2-T08 Reset password and auth rate limiting

**Goal:** Users set a new password with a valid reset token, and authentication routes are rate-limited.
**Source:** Repo extra: forgot / reset password; brief section 09 (rate limiting); code conventions ("rate-limit authentication routes").
**Depends on:** P2-T07.

**Scope**
- Endpoint: `POST /api/v1/auth/reset-password` (public; token in body or path, as decided in P2-T07). Body: token, new password, confirmation.
- Business rules: the token works once, only before expiry; after reset, the token fields are cleared, the password-changed timestamp updates, and old JWTs stop working.
- Rate limiting with `express-rate-limit` on register, login, forgot-password, and reset-password. Limits and window come from config. Responses use your error shape and `429`. Make sure `trust proxy` (P1-T07) is set correctly for how you run the app.

**Not in this task:** account lockout after N failures (not in MVP).

**Acceptance criteria (verify in Postman)**
- Valid token -> `200`, can log in with the new password, old JWT -> `401`.
- Same token again -> `400` (or `401`), generic message.
- Expired token (shorten expiry in config to test) -> rejected.
- Exceed the login limit using the Postman runner -> `429` in your error shape.

**Concepts to review:** single-use tokens; rate limiting by IP and its limits behind proxies; `express-rate-limit` current options (latest docs).

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P2-T09 Delivery addresses

**Goal:** Customers manage multiple Egyptian delivery addresses, with strict ownership.
**Source:** EC-05 ("one or more delivery addresses"); brief section 03 ("Egyptian address and phone"); brief section 02 (ownership).
**Depends on:** P2-T03.

**Scope**
- Endpoints (authenticated user, own addresses only):
  - `GET /api/v1/users/me/addresses`
  - `POST /api/v1/users/me/addresses`
  - `PATCH /api/v1/users/me/addresses/:addressId`
  - `DELETE /api/v1/users/me/addresses/:addressId`
- Data: label (for example "Home"), recipient name, phone, governorate (from a fixed list of the Egyptian governorates, kept as a shared constant because shipping zones use it too), city/area, street, building, floor/apartment (optional), notes (optional), default flag.
- Business rules: at most one default address; the first address becomes default; deleting the default promotes another or leaves none (choose and document). Decide a maximum number of addresses per user.
- Storage: as decided in P1-T08 (embedded or separate).

**Not in this task:** shipping fees (P4-T01).

**Acceptance criteria (verify in Postman)**
- Create two addresses -> the first is default. Set the second as default -> only one default in DB.
- No token -> `401`.
- User B reads, updates, or deletes user A's address id -> `404`, and A's address is unchanged.
- Governorate not in the list -> `400`. Bad phone -> `400`.
- Above the maximum -> `409` (or `400`, documented).

**Concepts to review:** ownership checks vs role checks; enforcing "only one default" (in code vs in an index); embedded subdocument updates.

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, invalid input is rejected, database state is correct, and `/review-task` has returned "Ready".

---

### P2-T10 Audit log module

**Goal:** A module that records who changed what and when, used by every later task that changes money, stock, roles, or order status.
**Source:** Brief section 02 ("log financial, inventory ... changes with the user identity and timestamp"); decisions "Audit log".
**Depends on:** P2-T05.

**Scope**
- Data: actor (user id and role at the time), action (a fixed set of names, for example `user.role_changed`), entity type, entity id, a summary of the change (before/after values for the changed fields), optional reason, timestamp. Indexes for the lookups below.
- A service function other modules call. Decide: does a failed audit write fail the main operation? (Hint: think about this again when you reach transactions in P5-T02.)
- Entries are append-only: no update or delete endpoint.
- Endpoint: `GET /api/v1/admin/audit-logs` (admin only), paginated, filter by entity type, entity id, actor, action, date range; newest first.
- Retrofit: role changes and activation changes from P2-T05 now write audit entries.

**Not in this task:** logging catalog or order changes (each later task adds its own).

**Acceptance criteria (verify in Postman)**
- Change a user's role -> one audit entry with actor, before/after role, timestamp.
- Filter by entity id -> only that user's entries.
- No token -> `401`. Catalog manager, order operator, or customer -> `403`.

**Concepts to review:** audit trails and immutability; designing a log schema for querying; cross-module calls in a modular monolith (who depends on whom).

**Definition of done:** all acceptance criteria pass in Postman, unauthorized access is rejected, database state is correct, and `/review-task` has returned "Ready".
