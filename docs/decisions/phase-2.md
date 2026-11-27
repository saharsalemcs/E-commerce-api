## User model (P2-T01, 2026-11-28)
- **Hashing library: `bcryptjs`.**
*Why:* pure JavaScript with zero dependencies, so there is no native build step on Windows. Cost accepted: it is slower than the native `bcrypt`.
- **Hashing lives in `src/common/utils/password.js`, called by services, not in a model hook.** Cost factor from `BCRYPT_ROUNDS` (default 12, allowed 10 to 14).
*Why:* `save` hooks do not run on `updateOne` / `findOneAndUpdate`, so a password changed by a query update would be stored in plain text. Register, staff creation, password change, reset and the seed script all share one helper. Cost accepted: every service that writes a password must remember to call it.
- **Egyptian phone rule:** `^01[0125][0-9]{8}$` (11 digits: `010`, `011`, `012` or `015` plus 8 digits, no country code or spaces). Defined once as `EGYPT_PHONE_REGEX` in `src/common/validators/common.js`; Zod schemas reuse the same constant.

## Open (the learner decides during `/plan-task`)
- Auth token transport (header or cookie) and the exact reset-password flow.
- Transactions versus compensating steps for order creation.
- Folder structure details (see `.claude/rules/folder-structure.md`).

## Libraries
**In scope (verify the latest version before using):** `express`, `mongoose`, `zod`, `jsonwebtoken`, `bcrypt` (or `bcryptjs`), `helmet`, `cors`, `express-rate-limit`, `dotenv` (or Node's `--env-file`), `morgan`, `slugify`, `resend`, `nodemon` (or `node --watch`), ESLint, Prettier.

**Deferred:** `multer`, `sharp`, a cloud storage SDK, `jest` or `vitest`, `supertest`, `mongodb-memory-server`, `swagger-ui-express`, `swagger-jsdoc`, `node-cron`, and the raw-body / HMAC handling needed for webhooks.

The authentication libraries are assumed to be familiar from the course. The learner will say if any library is new.