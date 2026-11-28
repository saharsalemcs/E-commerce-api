## User model (P2-T01, 2026-11-28)
- **Hashing library: `bcryptjs`.**
*Why:* pure JavaScript with zero dependencies, so there is no native build step on Windows. Cost accepted: it is slower than the native `bcrypt`.
- **Hashing lives in `src/common/utils/password.js`, called by services, not in a model hook.** Cost factor from `BCRYPT_ROUNDS` (default 12, allowed 10 to 14).
*Why:* `save` hooks do not run on `updateOne` / `findOneAndUpdate`, so a password changed by a query update would be stored in plain text. Register, staff creation, password change, reset and the seed script all share one helper. Cost accepted: every service that writes a password must remember to call it.
- **Egyptian phone rule:** `^01[0125][0-9]{8}$` (11 digits: `010`, `011`, `012` or `015` plus 8 digits, no country code or spaces). Defined once as `EGYPT_PHONE_REGEX` in `src/common/validators/common.js`; Zod schemas reuse the same constant.

## Register (P2-T02, 2026-11-28)

### Token transport
- **Decision: `Authorization: Bearer <token>` header, not a cookie.** The token is returned in the response body as `data.token`, and the client sends it back in the header on protected requests.
*Why:*
- The browser does not attach the header automatically, so the API is not exposed to CSRF through this token and needs no CSRF protection for it.
- Works the same for every client (Postman, web, mobile) and needs no cookie settings (`SameSite`, `Secure`, CORS credentials).
- Cost accepted: the client has to store the token, and a token readable by JavaScript can be stolen through XSS. An httpOnly cookie would prevent that read, at the price of handling CSRF.
- **Token content:** signed with HS256, the only custom claim is `sub` (user id). Secret and expiry come from the config module (`JWT_SECRET`, `JWT_EXPIRES_IN`).

### Validation rules
Schema: `registerBodySchema` in `src/modules/auth/auth.validation.js`.
- **Unknown fields are rejected** with `400` (the P1-T06 strict rule), so `role` in the body fails the request. The service also sets `role` to `customer` itself.
- **`name`:** trimmed, 2 to 40 characters, the same limits as the User model.
- **`email`:** trimmed and lowercased first, then format-checked, matching how the model stores it.
- **`phone`:** trimmed, then checked with `EGYPT_PHONE_REGEX`.
- **`password`:** at least 8 characters, at most 72 bytes in UTF-8, never trimmed. No uppercase, digit or symbol rules.
*Why:* bcrypt ignores everything after 72 bytes, so a longer password is rejected instead of silently truncated. The limit is in bytes because a non-ASCII character takes more than one. Spaces are valid password characters. Length is preferred over composition rules.
- **`passwordConfirm`:** the confirmation field name. It must equal `password`; the mismatch is reported on `body.passwordConfirm`, even when unrelated fields also fail. It is never passed to the model.

## Open (the learner decides during `/plan-task`)
- The exact reset-password flow.
- Transactions versus compensating steps for order creation.
- Folder structure details (see `.claude/rules/folder-structure.md`).

## Libraries
**In scope (verify the latest version before using):** `express`, `mongoose`, `zod`, `jsonwebtoken`, `bcrypt` (or `bcryptjs`), `helmet`, `cors`, `express-rate-limit`, `dotenv` (or Node's `--env-file`), `morgan`, `slugify`, `resend`, `nodemon` (or `node --watch`), ESLint, Prettier.

**Deferred:** `multer`, `sharp`, a cloud storage SDK, `jest` or `vitest`, `supertest`, `mongodb-memory-server`, `swagger-ui-express`, `swagger-jsdoc`, `node-cron`, and the raw-body / HMAC handling needed for webhooks.

The authentication libraries are assumed to be familiar from the course. The learner will say if any library is new.