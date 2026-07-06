# SRMSS — Mock Data → PostgreSQL Migration

This project now runs on a real Express + PostgreSQL backend instead of
localStorage/mock data. Here's how to bring it up on your Windows machine.

## 1. Install PostgreSQL
Download and install from https://www.postgresql.org/download/windows/
(remember the password you set for the `postgres` superuser).

## 2. Create the database
Open **SQL Shell (psql)** or PowerShell and run:

```powershell
psql -U postgres
```
```sql
CREATE DATABASE srmss;
\q
```

## 3. Load the schema (tables) and seed data
From the project folder in PowerShell:

```powershell
psql -U postgres -d srmss -f database/schema.sql
psql -U postgres -d srmss -f database/seed.sql   # optional starter data
```
Or via the npm shortcuts (same thing):
```powershell
npm run db:schema
npm run db:seed
```

Tables created: `depots`, `buses`, `drivers`, `routes`, `schedules`,
`maintenance_logs`, `fuel_logs`, `audit_logs`, `bus_stops`.

## 4. Configure environment variables
Copy `.env.example` to `.env` and fill in your Postgres password:
```
DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/srmss"
SERVER_PORT=4000
VITE_API_BASE_URL="/api"
```

## 5. Install the new backend dependencies
```powershell
npm install
```
(this pulls in `pg`, `cors`, and `concurrently`, added to `package.json`)

## 6. Run it
Two options:

**Option A — one command (recommended):**
```powershell
npm run dev:all
```
Runs the Express API (port 4000) and the Vite dev server (port 3000) together.

**Option B — two terminals:**
```powershell
npm run server   # Terminal 1 — Express API on :4000
npm run dev      # Terminal 2 — React app on :3000
```

Open http://localhost:3000. Vite proxies `/api/*` requests straight to the
Express server, so no CORS setup is needed in dev.

## What changed
- **`database/schema.sql`** / **`database/seed.sql`** — full Postgres schema
  + the old mock dataset translated into `INSERT`s, so you start with the
  same demo data you had before.
- **`server/`** — new Express backend (`server/index.js`) exposing REST CRUD
  endpoints for every module: `/api/routes`, `/api/buses`, `/api/drivers`,
  `/api/schedules`, `/api/maintenance-logs`, `/api/fuel-logs`,
  `/api/audit-logs`, `/api/depots`, `/api/bus-stops`.
- **`src/services/api.ts`** — frontend API client used by the React app.
- **`src/App.tsx`** — no longer reads/writes `localStorage` or imports
  `mockData.ts`. On load it calls the API; every Add/Update/Delete handler
  now calls the matching API endpoint and only updates React state once the
  database confirms the write.
- **`src/data/mockData.ts`** — deleted. The only thing kept was the static
  city-coordinate lookup table and demo depot/bus-stop markers used purely
  for map rendering — those moved to `src/data/geography.ts` since they're
  reference/display data, not business records edited through the UI.
  (Depots and bus stops *do* have real `/api/depots` and `/api/bus-stops`
  endpoints ready, in case you later want to manage them through the UI too.)
- **`server/package.json`** — `{ "type": "commonjs" }`. The root
  `package.json` has `"type": "module"` (for Vite), which would otherwise
  make Node treat every `server/*.js` file as an ES module and reject
  `require()`. This file scopes the `server/` folder back to CommonJS
  without touching the frontend's module settings.
- **`vite.config.ts`** — added a dev proxy so `/api` calls reach the Express
  server on port 4000.
- **`package.json`** — added `pg`, `cors`, `concurrently`, plus `server`,
  `dev:all`, `db:schema`, `db:seed` scripts.

## Note on authentication — now migrated too
Login now runs against real accounts in a PostgreSQL `users` table, with
scrypt-hashed passwords and JWT access/refresh tokens — no more
`DEMO_ACCOUNTS` array in the frontend.

- `database/schema.sql` — added a `users` table (`role` CHECK-constrained to
  `Administrator` / `Depot Manager` / `Operator`, exactly like before).
- `database/seed.sql` — seeds the same three demo accounts you had
  (admin/Admin@123, manager/Manager@123, operator/Operator@123), now with
  hashed passwords.
- `server/utils/password.js` — hashes/verifies passwords with Node's
  built-in `crypto.scrypt` (no bcrypt/argon2 package needed).
- `server/utils/jwt.js` — signs/verifies standard HS256 JWTs using only
  Node's built-in `crypto` (no `jsonwebtoken` package needed).
- `server/routes/auth.routes.js` — `POST /api/auth/login`, `GET /api/auth/me`,
  `POST /api/auth/refresh`, `POST /api/auth/logout`,
  `POST /api/auth/password-reset`.
- `server/middleware/auth.js` — `authenticateToken` (requires a valid Bearer
  access token) and `blockOperatorWrites` (403s any non-GET request from the
  read-only Operator role) — both are now applied in `server/index.js` to
  every business-data route (`/api/routes`, `/api/buses`, etc.). Only
  `/api/auth/*` and `/api/health` stay public.
- `src/authentication/services/authService.ts` — now calls the real
  endpoints above instead of checking an in-memory array.
- `src/services/api.ts` — every request now attaches
  `Authorization: Bearer <accessToken>`; a 401 response fires a
  `srmss:session-expired` event.
- `src/authentication/context/AuthContext.tsx` — listens for that event and
  logs the user out automatically (e.g. if the access token expires mid-
  session), and persists rotated tokens back to storage after a silent
  refresh on app load.

**Change the JWT secrets before deploying anywhere real** — `.env.example`
has `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` placeholders; generate proper
random values with:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Known limitation:** refresh tokens are stateless (not stored server-side),
so there's no way to revoke a specific session before it naturally expires
(`REFRESH_TOKEN_TTL_DAYS`, default 7 days). Add a `revoked_tokens` table (or
track active refresh tokens per-user) if you need forced logout/revocation
later.
