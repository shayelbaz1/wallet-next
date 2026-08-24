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

const ROW_ID = "default";
const LOCAL_FILE = join(process.cwd(), ".wallet-data.json");

export const usingPostgres = Boolean(process.env.DATABASE_URL);

// ── Postgres ────────────────────────────────────────────────────────────────
let _sql;
const sql = () => (_sql ??= neon(process.env.DATABASE_URL));

// Cheap to re-run; Neon pools the connection. Keeps deploys self-provisioning
// so there's no separate "run the migration" step on first boot.
let _schemaReady;
const ensureSchema = () =>
  (_schemaReady ??= sql()`
    create table if not exists wallet_state (
      id       text primary key,
      data     jsonb not null,
      saved_at timestamptz not null default now()
    )
  `);

// ── Local file ──────────────────────────────────────────────────────────────
const readLocal = async () => {
  if (!existsSync(LOCAL_FILE)) return {};
  try {
    return JSON.parse(await readFile(LOCAL_FILE, "utf8"));
  } catch {
    return {};
  }
};

const writeLocal = async (state) => {
  const tmp = LOCAL_FILE + ".tmp";
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

export async function writeState(state) {
  const savedAt = new Date().toISOString();
  const payload = { ...state, savedAt };

  if (!usingPostgres) {
    await writeLocal(payload);
    return savedAt;
  }

  await ensureSchema();
  await sql()`
    insert into wallet_state (id, data, saved_at)
    values (${ROW_ID}, ${JSON.stringify(payload)}::jsonb, ${savedAt})
    on conflict (id) do update
      set data = excluded.data, saved_at = excluded.saved_at
  `;
  return savedAt;
}
