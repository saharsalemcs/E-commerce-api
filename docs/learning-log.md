# Learning log

One entry per task that reached "Ready" in `/review-task`: date, task ID, the most important feedback, concepts learned.

<!-- entries are appended below -->

## 2026-11-22: P1-T01 Project setup and folder structure
- **Feedback:** `app.js` is separate from `server.js`; `.gitignore` uses `.env*` with `!.env.example`; empty folders are not tracked by Git; module system changed from ESM to CommonJS and recorded in `docs/02-decisions.md`.
- **Concepts:** CommonJS vs ESM, why `app` and `server` are split, modular monolith vs layered-by-type folders, `engines` in `package.json`.

## 2026-11-22: P1-T02 Linting and formatting
- **Feedback:** the ESLint config must use the same module system as the project (CommonJS, not `import`); Prettier needs a small config and a `.prettierignore` so `format` does not touch docs and lockfiles; `endOfLine: auto` avoids CRLF warnings on Windows.
- **Concepts:** ESLint flat config, `sourceType: "commonjs"`, formatting rules (Prettier) vs correctness rules (ESLint), `eslint-config-prettier`.

## 2026-11-22: P1-T03 Configuration module
- **Feedback:** all env access lives in `src/config/index.js`; Zod validation at startup prints key names and never values; no defaults on purpose (fail fast); `Object.freeze` is shallow; `process.exit` inside a module is a trade-off against `throw`; morgan enabled only when `config.env` is `development`, and it is a runtime dependency.
- **Concepts:** fail-fast configuration, 12-factor config, `z.coerce`, `process.env` values are always strings, middleware order in Express.
