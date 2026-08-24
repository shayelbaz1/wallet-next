# wallet-next

The Wallet dashboard as a single Next.js app — UI and API in one deployable
unit. Replaces the old `wallet-app` (Vite) + `wallet-server` (Node) pair.

## Run locally

```bash
npm install
npm run dev
```

Opens on http://localhost:3000. With no `DATABASE_URL` set, state is stored in
`.wallet-data.json` in this folder — same behaviour as the old wallet-server, no
setup required.

## Layout

| Path | Was |
|---|---|
| `app/page.jsx` | `src/main.jsx` |
| `app/layout.jsx` | `index.html` |
| `app/api/state/route.js` | `wallet-server/server.mjs` |
| `lib/Wallet.jsx` | `src/Wallet.jsx` (unchanged but for `"use client"`) |
| `lib/db.js` | *new* — Postgres in prod, file on disk locally |
| `public/pdf.worker.min.mjs` | Vite's `?url` import |

## Deploying

### 1. Push to GitHub

The repo at `/Users/admin/DEV` doesn't track this folder yet. Either add it
there or give this folder its own repo:

```bash
git init && git add . && git commit -m "wallet as a next.js app"
```

Confirm `.wallet-data.json` is **not** in `git status` before pushing — it holds
real salary and expense data.

### 2. Create the database

In the Vercel dashboard: **Storage → Create → Neon**. Vercel sets `DATABASE_URL`
on the project automatically. (Or create one at neon.tech and add the connection
string as an env var yourself.)

### 3. Import existing data

Run once, against the Neon URL, to bring the 124 expenses across:

```bash
DATABASE_URL='postgres://…' npm run db:migrate
```

Reads `../wallet-server/wallet-data.json` by default. Refuses to overwrite an
existing row unless you pass `--force`.

### 4. Deploy

Import the repo at vercel.com. Framework auto-detects; no build config needed.

### 5. Verify

```bash
curl https://your-app.vercel.app/api/health
```

Must report `{"ok":true,"storage":"postgres"}`. If it says `local-file`, the env
var didn't land — the app would appear to work while losing every write, since
Vercel's filesystem is read-only.

## Schema

One row, JSONB, matching the shape the client already sends:

```sql
create table wallet_state (
  id       text primary key,
  data     jsonb not null,
  saved_at timestamptz not null default now()
);
```

Created automatically on first request. The client loads and saves whole state
at once, so normalising `expenses` into its own table would mean reworking
`Wallet.jsx`'s data flow — worth doing if you later want to query or page
through history, but not required to ship.

## No authentication

There is none. Anyone with the URL can read every figure and overwrite the data
via `PUT /api/state`. `X-Robots-Tag: noindex` keeps it out of search results,
which is obscurity, not protection.

To add a password gate later: a `middleware.js` at the project root checking a
cookie against an env var covers the whole app, including the API route, in
about forty lines. Nothing in the current structure needs to change for it.
