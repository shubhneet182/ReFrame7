/** POSTs JSON to an internal API route. Returns null when the route fails. */
export async function postJson<TRequest, TResponse>(
  path: string,
  body: TRequest,
): Promise<TResponse | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      // The reason is in the browser console; the UI shows a friendly fallback.
      console.error(`[api] ${path} failed: ${response.status}`, await response.text());
      return null;
    }
    return (await response.json()) as TResponse;
  } catch (error) {
    console.error(`[api] ${path} failed:`, error);
    return null;
  }
}
