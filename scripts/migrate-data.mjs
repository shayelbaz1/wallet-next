// One-time import of a wallet-data.json snapshot into Postgres.
//
//   DATABASE_URL='postgres://…' node scripts/migrate-data.mjs [path-to-json] [--force]
//
// `npm run db:migrate -- --force` if invoking through npm — a bare
// `npm run db:migrate --force` (no `--`) is swallowed by npm itself and the
// script never sees it, which looks like the flag silently did nothing.
//
// Defaults to this project's own .wallet-data.json (the file `npm run dev`
// actually writes to), falling back to ../wallet-server/wallet-data.json only
// if that one doesn't exist — the old server's snapshot predates this app and
// running `npm run dev` even once makes it stale.
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const force = args.includes("--force");
const srcArg = args.find((a) => !a.startsWith("--"));
const localStore = join(root, ".wallet-data.json");
const legacyStore = join(root, "..", "wallet-server", "wallet-data.json");
const src = resolve(srcArg || (existsSync(localStore) ? localStore : legacyStore));

if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL is not set.\n  Run:  DATABASE_URL='postgres://…' npm run db:migrate");
  process.exit(1);
}
if (!existsSync(src)) {
  console.error(`✗ No data file at ${src}`);
  process.exit(1);
}

const state = JSON.parse(await readFile(src, "utf8"));
const expenses = state.expenses || [];
const finance = state.finance || {};

console.log(`Source:   ${src}`);
console.log(`Expenses: ${expenses.length}`);
console.log(`Finance:  ${Object.keys(finance).join(", ") || "(none)"}`);

if (!expenses.length && !Object.keys(finance).length) {
  console.error("✗ Nothing to import — file has no expenses or finance data.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  create table if not exists wallet_state (
    id       text primary key,
    data     jsonb not null,
    saved_at timestamptz not null default now()
  )
`;

const existing = await sql`select saved_at, data from wallet_state where id = 'default'`;
if (existing.length && !force) {
  const n = (existing[0].data.expenses || []).length;
  console.error(
    `\n✗ Row already exists (${n} expenses, saved ${existing[0].saved_at}).` +
      `\n  Re-run with --force:  DATABASE_URL='…' node scripts/migrate-data.mjs --force` +
      `\n  (via npm, the -- separator is required: npm run db:migrate -- --force)`
  );
  process.exit(1);
}

const savedAt = new Date().toISOString();
const payload = JSON.stringify({ expenses, finance, savedAt });

await sql`
  insert into wallet_state (id, data, saved_at)
  values ('default', ${payload}::jsonb, ${savedAt})
  on conflict (id) do update
    set data = excluded.data, saved_at = excluded.saved_at
`;

// Read back rather than trusting the write.
const [row] = await sql`select data from wallet_state where id = 'default'`;
console.log(`\n✓ Imported ${(row.data.expenses || []).length} expenses into Postgres.`);
