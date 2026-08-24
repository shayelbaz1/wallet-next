// Handy for confirming a deploy is wired to Postgres rather than silently
// falling back to the local-file adapter.
import { usingPostgres } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, storage: usingPostgres ? "postgres" : "local-file" });
}
