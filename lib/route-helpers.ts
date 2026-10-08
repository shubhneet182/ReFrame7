import { NextResponse } from "next/server";
import { AIUnavailableError } from "@/lib/ai";
import { detectCrisis } from "@/lib/crisis";
import { createClient } from "@/lib/supabase/server";
import type { ApiError, UserPreferences } from "@/types";

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

export async function getSession() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { user, supabase, preferences: user.user_metadata as UserPreferences } : null;
}

/**
 * Gate for anything that sends the user's writing to an AI provider.
 * Returns an error response, or null when the request may proceed.
 */
export function aiGate(preferences: UserPreferences, texts: string[]): NextResponse<ApiError> | null {
  if (preferences.ai_enabled !== true) {
    return jsonError("AI suggestions are turned off for this account", 403);
  }
  // In a possible crisis the app shows support resources, not AI text.
  if (detectCrisis(texts.join("\n"))) {
    return jsonError("AI suggestions are paused while crisis resources are shown", 409);
  }
  return null;
}

export function aiFailure(route: string, error: unknown): NextResponse<ApiError> {
  console.error(`[${route}]`, error);
  return error instanceof AIUnavailableError
    ? jsonError("No AI provider is available", 503)
    : jsonError("The AI reply could not be used", 502);
}
