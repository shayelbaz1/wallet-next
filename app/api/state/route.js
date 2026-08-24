// Replaces wallet-server/server.mjs. Same contract the client already speaks:
//   GET  /api/state → the saved { expenses, finance } (or {} if nothing yet)
//   PUT  /api/state → body is JSON { expenses, finance }; persisted
//
// No CORS headers needed — the app and the API are now the same origin.
import { readState, writeState } from "@/lib/db";

// State is per-request and must never be cached at the edge.
export const dynamic = "force-dynamic";

const MAX_BODY = 5e6;

export async function GET() {
  try {
    return Response.json(await readState());
  } catch (e) {
    console.error("GET /api/state failed:", e);
    return Response.json({ error: "read failed" }, { status: 500 });
  }
}

export async function PUT(request) {
  let state;
  try {
    const body = await request.text();
    if (body.length > MAX_BODY) {
      return Response.json({ ok: false, error: "payload too large" }, { status: 413 });
    }
    state = JSON.parse(body || "{}");
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 400 });
  }

  try {
    const savedAt = await writeState(state);
    console.log(`✓ saved state (${(state.expenses || []).length} expenses) ${savedAt}`);
    return Response.json({ ok: true, savedAt });
  } catch (e) {
    console.error("PUT /api/state failed:", e);
    return Response.json({ ok: false, error: "write failed" }, { status: 500 });
  }
}
