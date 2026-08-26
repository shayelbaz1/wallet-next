// Replaces wallet-server/server.mjs. Same contract the client already speaks:
//   GET  /api/state → the saved { expenses, finance } (or {} if nothing yet)
//   PUT  /api/state → body is JSON { expenses, finance, expectedSavedAt? };
//                     persisted, or 409 with the current state on conflict
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
  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return Response.json({ ok: false, error: "payload too large" }, { status: 413 });
    }
    body = JSON.parse(raw || "{}");
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 400 });
  }

  const { expenses, finance, expectedSavedAt } = body;
  // The client always sends both fields; a malformed or hand-crafted request
  // hitting this without them used to be accepted and would blank the store.
  if (!Array.isArray(expenses) || typeof finance !== "object" || finance === null) {
    return Response.json(
      { ok: false, error: "expenses must be an array and finance an object" },
      { status: 400 }
    );
  }

  try {
    const result = await writeState({ expenses, finance }, expectedSavedAt);
    if (result.conflict) {
      // Someone else's write landed between this client's last read and now.
      // Hand back the current state instead of overwriting it.
      return Response.json({ ok: false, conflict: true, current: result.current }, { status: 409 });
    }
    console.log(`✓ saved state (${expenses.length} expenses) ${result.savedAt}`);
    return Response.json({ ok: true, savedAt: result.savedAt });
  } catch (e) {
    console.error("PUT /api/state failed:", e);
    return Response.json({ ok: false, error: "write failed" }, { status: 500 });
  }
}
