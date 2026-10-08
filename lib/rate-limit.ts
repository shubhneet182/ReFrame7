// Best-effort limiter for the public AI routes. It lives in memory, so on
// serverless hosting each instance counts separately: it slows casual abuse
// but is not a hard cap. Use a shared store (e.g. Upstash) for a real one,
// and set a spending limit with the AI provider as the true backstop.

const WINDOW_MS = 10 * 60 * 1000;
/** Per visitor. One full record uses about 4–8 AI calls. */
const MAX_PER_VISITOR = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Across all visitors: caps the total AI spend in a day. */
const MAX_PER_DAY = 400;

const hits = new Map<string, number[]>();
let day = { start: Date.now(), count: 0 };

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Records a request and returns false once the caller, or the whole app, is over its limit. */
export function allowRequest(key: string): boolean {
  const now = Date.now();

  if (now - day.start >= DAY_MS) day = { start: now, count: 0 };
  if (day.count >= MAX_PER_DAY) return false;

  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_PER_VISITOR) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  day.count += 1;

  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    hits.forEach((times, k) => {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(k);
    });
  }
  return true;
}
