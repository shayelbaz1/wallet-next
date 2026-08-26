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

Run once, against the Neon URL, to bring the expenses across:

```bash
DATABASE_URL='postgres://…' npm run db:migrate
```

Reads this project's own `.wallet-data.json` by default (falling back to
`../wallet-server/wallet-data.json` only if that file doesn't exist), since
`npm run dev` writes to the former and it's usually the newer of the two.
Refuses to overwrite an existing row — re-run with the flag if you need to:

```bash
DATABASE_URL='postgres://…' npm run db:migrate -- --force
```

(the `--` is required when invoking through `npm run`; a bare `--force` is
consumed by npm itself and the script never sees it.)

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

## Sync model

The client is local-first: every edit lands in `localStorage` immediately and
the debounced sync to `/api/state` is best-effort on top of that, not the
primary write path. Two things worth knowing if you extend this:

- **Reachability.** `loadFromServer()` retries with rising timeouts (3s/5s/8s)
  before concluding the server is unreachable and falling back to local-only
  mode. A single short timeout used to treat "server up but this request was
  slow" the same as "no server" — on a cold Postgres connection that's the
  common case, not the rare one, and it meant the very next edit would PUT
  local/empty state over the real remote data. Don't shorten these without
  re-checking against a cold Neon connection.
- **Concurrency.** Every save carries the `savedAt` it last saw from the
  server; the API rejects the write (409) if the stored value has since
  changed, and hands back the current state instead of overwriting it. This
  stops a stale tab (or a second device) from silently deleting whatever
  another tab wrote in between — but it's still last-confirmed-write-wins, not
  a merge. If you add real multi-device use, revisit this.

## No authentication

There is none. Anyone with the URL can read every figure and overwrite the data
via `PUT /api/state`. `X-Robots-Tag: noindex` keeps it out of search results,
which is obscurity, not protection.

To add a password gate later: a `middleware.js` at the project root checking a
cookie against an env var covers the whole app, including the API route, in
about forty lines. Nothing in the current structure needs to change for it.
