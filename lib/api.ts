interface PostOptions {
  /** Called when the route stopped the request because the entry suggests a crisis. */
  onCrisis?: () => void;
}

/** POSTs JSON to an internal API route. Returns null when the route fails. */
export async function postJson<TRequest, TResponse>(
  path: string,
  body: TRequest,
  options: PostOptions = {},
): Promise<TResponse | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 409) {
      // The server's crisis check (phrase patterns, or the AI's own flag).
      options.onCrisis?.();
      return null;
    }
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
