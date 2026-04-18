# Resilient Focus CBT

A **computer-based testing (CBT)** web app built with **SvelteKit**, **SQLite** (`better-sqlite3`), and **Lucia** authentication. It supports three roles—**participant**, **operator**, and **admin**—for taking timed exams, monitoring live progress, and importing quiz content.

## Quick summary

The server stores users, encrypted quiz bundles, assignments, and exam telemetry in a local SQLite database under `data/cbt-sync.db`. Participants take tests in the browser with a TOTP gate, countdown timer, and optional fullscreen; answers and state sync back to the server. Operators watch participant progress for a quiz; admins trigger a “pull” sync that imports quizzes from a mock API or a configurable external HTTP endpoint.

## Quick start

**Prerequisites:** Node.js (current LTS recommended), npm.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the dev server** (listens on `0.0.0.0:3000`)

   ```bash
   npm run dev
   ```

3. **Sign in** at [http://localhost:3000/login](http://localhost:3000/login).

   On first startup, if the database is empty, the app seeds demo users:

   | Username   | Role        | Default password                          |
   | ---------- | ----------- | ----------------------------------------- |
   | `student`  | participant | `changeme123` (or `SEED_PASSWORD` if set) |
   | `operator` | operator    | same                                      |
   | `admin`    | admin       | same                                      |

4. **Production build** (Node adapter)

   ```bash
   npm run build
   npm run preview
   ```

Useful scripts: `npm run check` (Svelte/TS), `npm run lint`, `npm test` (Vitest).

## Features

- **Role-based access:** Participant, operator, and admin areas with session cookies (Lucia + Argon2 password hashes).
- **Exams:** Timed sessions, question navigation, flags, doubtful marking, fullscreen enforcement, and TOTP verification at the gate using the quiz passcode seed.
- **Client persistence:** IndexedDB (RxDB) for answers and state with **background sync** to `/api/sync`.
- **Operator dashboard:** Live-ish view of assigned participants (polling) and optional manual exam start.
- **Admin sync:** POST `/api/admin/sync` pulls quiz bundles via `pullQuizzesFromExternal()`—**mock JSON fixtures by default**, or a real `EXTERNAL_SYNC_BASE_URL` when `EXTERNAL_SYNC_MOCK=false`.
- **Security-oriented logging:** Server-side records for answers, participant state, and security events.

## Configuration (environment)

| Variable | Purpose |
| -------- | ------- |
| `SEED_PASSWORD` | Password used when seeding the initial demo users (default: `changeme123`). |
| `SESSION_COOKIE_SECURE` | `true` / `false` to force secure cookies; otherwise follows `NODE_ENV === 'production'`. |
| `EXTERNAL_SYNC_MOCK` | Set to `false` to call a real external sync URL (default: mock fixtures). |
| `EXTERNAL_SYNC_BASE_URL` | Base URL for HTTP pull (e.g. `https://api.example.com`); expects a `GET /quizzes`-style JSON response with `bundles`. |
| `EXTERNAL_SYNC_API_KEY` | Optional `Authorization: Bearer …` for external sync. |

The SQLite file is created automatically at `data/cbt-sync.db`.

## Q&A

**Where does quiz content come from?**  
By default, admin sync uses bundled JSON mocks. For production-style integration, point `EXTERNAL_SYNC_BASE_URL` at your service and set `EXTERNAL_SYNC_MOCK=false`.

**Why don’t I see GEMINI / AI features in the app?**  
This codebase does not call the Gemini API. Any `GEMINI_API_KEY` / `APP_URL` entries in sample env files are legacy placeholders and are not required to run CBT locally.

**How do I reset the database?**  
Stop the server, delete `data/cbt-sync.db`, and restart; empty DB triggers a fresh seed (when no users exist).

**What port does dev use?**  
`3000` (see `package.json` `dev` script).

**Is HTTPS required locally?**  
No; session cookie security is environment-driven (see `SESSION_COOKIE_SECURE`).

## Future development

- **Real external sync:** Harden the `GET /quizzes` contract, pagination, idempotency, and conflict handling when importing bundles.
- **Operator / admin UX:** Richer filtering, multiple quizzes, export of results, and audit views over `security_logs`.
- **Exam integrity:** Expand proctoring options, stricter device checks, and clearer recovery when sync fails mid-exam.
- **Deployment:** Document production env vars, reverse proxy + HTTPS, and backups for `data/cbt-sync.db` (or migrate to a managed database if scaling horizontally).

---

*Package name in `package.json`: `resilient-focus-cbt`.*
