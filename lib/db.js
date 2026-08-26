// Storage adapter for the whole wallet state.
//
// Production (DATABASE_URL set) → Neon Postgres, one JSONB row.
// Local dev  (no DATABASE_URL)  → .wallet-data.json on disk, same as the old
//                                 wallet-server. Lets `npm run dev` work with
//                                 zero setup.
//
// Both branches speak the same two functions, so the API route never has to
// care which one is live.
import { neon } from "@neondatabase/serverless";
import { readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const ROW_ID = "default";
// Relative to process.cwd(), which `npm run dev`/`npm run start` (the only
// ways this app documents running it) always set to the project root. This
// only matters when DATABASE_URL is unset anyway, which production always
// sets. (An env-var override was tried here to protect against a process
// manager launching from a different cwd, but any indirection beyond a plain
// join(process.cwd(), "literal") stops Turbopack's static analysis from
// recognizing this as scoped filesystem access — it then traces and bundles
// the entire project, public/ included, into the serverless function. Not
// worth that cost for a launch method nothing here uses.)
const LOCAL_FILE = join(process.cwd(), ".wallet-data.json");
let _loggedPath = false;

export const usingPostgres = Boolean(process.env.DATABASE_URL);

// ── Postgres ────────────────────────────────────────────────────────────────
let _sql;
const sql = () => (_sql ??= neon(process.env.DATABASE_URL));

// @neondatabase/serverless query results are lazy thenables that re-execute
// their query on every `await`, not settled promises — caching the object
// itself in `??=` was a no-op and re-ran `create table` on every single
// request, doubling read/write latency (and that extra round-trip is what
// was pushing GET past the client's 1500ms abort in practice). Wrapping it in
// an async IIFE forces it to run once and caches the resolved value; clearing
// the cache on rejection means a transient failure gets retried instead of
// being remembered as "ready" forever.
let _schemaReady;
const ensureSchema = () =>
  (_schemaReady ??= (async () => {
    await sql()`
      create table if not exists wallet_state (
        id       text primary key,
        data     jsonb not null,
        saved_at timestamptz not null default now()
      )
    `;
  })().catch((e) => {
    _schemaReady = undefined;
    throw e;
  }));

// ── Local file ──────────────────────────────────────────────────────────────
const readLocal = async () => {
  if (!_loggedPath) {
    _loggedPath = true;
    console.log(`💾 wallet-next local store: ${LOCAL_FILE}`);
  }
  if (!existsSync(LOCAL_FILE)) return {};
  try {
    return JSON.parse(await readFile(LOCAL_FILE, "utf8"));
  } catch {
    return {};
  }
};

const writeLocal = async (state) => {
  // Unique per call: two overlapping writes (two tabs debouncing at once)
  // used to share one fixed ".tmp" path, so the shorter write could truncate
  // the longer one mid-write before either renamed, corrupting the file.
  const tmp = `${LOCAL_FILE}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await rename(tmp, LOCAL_FILE); // atomic replace
};

// ── Public API ──────────────────────────────────────────────────────────────
export async function readState() {
  if (!usingPostgres) return readLocal();

  await ensureSchema();
  const rows = await sql()`select data, saved_at from wallet_state where id = ${ROW_ID}`;
  if (!rows.length) return {};
  return { ...rows[0].data, savedAt: rows[0].saved_at };
}

// `expectedSavedAt` is the savedAt the caller last read. When given, the write
// only lands if the stored value still matches — otherwise someone else wrote
// in between and this call would silently discard their change (two tabs, two
// devices, or a slow request racing a fast one). On a mismatch this returns
// the current stored state instead of writing, so the caller can reconcile
// rather than clobber. Omit it to write unconditionally (first-ever save).
export async function writeState(state, expectedSavedAt) {
  const savedAt = new Date().toISOString();
  const payload = { ...state, savedAt };

  if (!usingPostgres) {
    if (expectedSavedAt !== undefined) {
      const current = await readLocal();
      if (current.savedAt !== expectedSavedAt) return { conflict: true, current };
    }
    await writeLocal(payload);
    return { savedAt };
  }

  await ensureSchema();

  if (expectedSavedAt !== undefined) {
    const rows = await sql()`
      update wallet_state
      set data = ${JSON.stringify(payload)}::jsonb, saved_at = ${savedAt}
      where id = ${ROW_ID} and saved_at = ${expectedSavedAt}
      returning saved_at
    `;
    if (!rows.length) {
      const current = await readState();
      return { conflict: true, current };
    }
    return { savedAt };
  }

  await sql()`
    insert into wallet_state (id, data, saved_at)
    values (${ROW_ID}, ${JSON.stringify(payload)}::jsonb, ${savedAt})
    on conflict (id) do update
      set data = excluded.data, saved_at = excluded.saved_at
  `;
  return { savedAt };
}
