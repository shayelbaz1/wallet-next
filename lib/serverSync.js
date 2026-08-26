// Client for the built-in /api/state route. Same origin as the app now, so no
// absolute base and no CORS. The app still works if the API is unreachable —
// localStorage remains the offline fallback.
const BASE = "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function attemptLoad(timeoutMs) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE}/api/state`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // aborted, or server unreachable
  }
}

// A single short-timeout attempt can't tell "server is down" apart from
// "server is up but this request hit a cold start" — a Neon-backed API route
// can easily take longer than a couple hundred ms on its first invocation.
// Treating both the same way used to mean the whole app fell back to
// (possibly empty) local state and then, moments later, overwrote the real
// server data with it. Retrying with rising timeouts before giving up makes
// a slow-but-reachable server behave like one, instead of like an absent one.
export async function loadFromServer() {
  const attempts = [3000, 5000, 8000];
  for (let i = 0; i < attempts.length; i++) {
    const data = await attemptLoad(attempts[i]);
    if (data !== null) {
      // Treat an empty object (no saved state yet) as "connected but nothing stored".
      return { connected: true, state: data && (data.expenses || data.finance) ? data : null };
    }
    if (i < attempts.length - 1) await sleep(1000 * (i + 1));
  }
  return null; // genuinely unreachable after real effort — safe to go local-only
}

// expectedSavedAt is the savedAt this client last saw from the server. The
// route rejects the write (409) if the stored value has since changed —
// otherwise a second tab, device, or a slow request finishing late would
// silently delete whatever else was written in between. Returns:
//   { ok: true, savedAt }                     — write landed
//   { ok: false, conflict: true, current }    — someone else wrote first;
//                                                `current` is their state
//   { ok: false }                             — unreachable / bad request
export async function saveToServer(state, expectedSavedAt, timeoutMs = 8000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE}/api/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...state, expectedSavedAt }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) return { ok: false, conflict: true, current: body.current ?? null };
    if (!res.ok) return { ok: false };
    return { ok: true, savedAt: body.savedAt };
  } catch {
    return { ok: false };
  }
}
