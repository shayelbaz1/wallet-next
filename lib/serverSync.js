// Client for the built-in /api/state route. Same origin as the app now, so no
// absolute base and no CORS. The app still works if the API is unreachable —
// localStorage remains the offline fallback.
const BASE = "";

export async function loadFromServer(timeoutMs = 1500) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE}/api/state`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    // Treat an empty object (no saved state yet) as "connected but nothing stored".
    return { connected: true, state: data && (data.expenses || data.finance) ? data : null };
  } catch {
    return null; // server not running / unreachable
  }
}

export async function saveToServer(state, timeoutMs = 4000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE}/api/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}
