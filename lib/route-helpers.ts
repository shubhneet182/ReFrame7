import { NextResponse } from "next/server";
import { AIUnavailableError } from "@/lib/ai";
import { detectCrisis } from "@/lib/crisis";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";
import type { ApiError } from "@/types";

const MAX_TEXT = 10_000;

export function jsonError(error: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ error }, { status });
}

export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** A string field within the size limit, or null. */
export function textField(value: unknown): string | null {
  return typeof value === "string" && value.length <= MAX_TEXT ? value : null;
}

type Viewer = Awaited<ReturnType<typeof getViewer>>;

/**
 * Entry check for the AI routes, which are open to guests as well as
 * signed-in users. Returns the viewer, or an error response.
 */
export async function getCaller(
  request: Request,
): Promise<{ viewer: Viewer; error?: undefined } | { viewer?: undefined; error: NextResponse<ApiError> }> {
  if (!allowRequest(clientKey(request))) {
    return { error: jsonError("Too many requests. Please wait a few minutes.", 429) };
  }
  const viewer = await getViewer();
  if (!viewer.accepted) {
    return { error: jsonError("The data-handling notice has not been accepted", 403) };
  }
  return { viewer };
}

/**
 * In a possible crisis the app shows support resources, not AI text.
 * Returns an error response, or null when the request may proceed.
 */
export function crisisGate(texts: string[]): NextResponse<ApiError> | null {
  return detectCrisis(texts.join("\n"))
    ? jsonError("AI suggestions are paused while crisis resources are shown", 409)
    : null;
}

export function aiFailure(route: string, error: unknown): NextResponse<ApiError> {
  console.error(`[${route}]`, error);
  return error instanceof AIUnavailableError
    ? jsonError("No AI provider is available", 503)
    : jsonError("The AI reply could not be used", 502);
}
