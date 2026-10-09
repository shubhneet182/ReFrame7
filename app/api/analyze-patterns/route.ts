import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai";
import { patternsPrompt, THINKING_PATTERNS } from "@/lib/prompts";
import { aiFailure, crisisGate, getCaller, jsonError, readBody, textField } from "@/lib/route-helpers";
import type { AnalyzePatternsResponse, ApiError, ThinkingPattern } from "@/types";

/** How many recent records are analysed in one request. */
const MAX_RECORDS = 20;

function toThoughts(value: unknown): { hotThought: string; automaticThoughts: string }[] {
  if (!Array.isArray(value)) return [];
  const thoughts: { hotThought: string; automaticThoughts: string }[] = [];
  for (const item of value.slice(0, MAX_RECORDS)) {
    const t = (item ?? {}) as Record<string, unknown>;
    const hotThought = textField(t.hotThought);
    const automaticThoughts = textField(t.automaticThoughts);
    if (!hotThought?.trim() || automaticThoughts === null) continue;
    thoughts.push({ hotThought, automaticThoughts });
  }
  return thoughts;
}

function toPatterns(data: unknown, recordCount: number): ThinkingPattern[] {
  const raw = (data as { patterns?: unknown }).patterns;
  if (!Array.isArray(raw)) return [];

  const allowed = new Map(THINKING_PATTERNS.map((name) => [name.toLowerCase(), name]));
  const seen = new Set<string>();
  const patterns: ThinkingPattern[] = [];

  for (const item of raw) {
    const p = (item ?? {}) as Record<string, unknown>;
    const name = typeof p.name === "string" ? allowed.get(p.name.trim().toLowerCase()) : undefined;
    if (!name || seen.has(name)) continue;
    if (typeof p.count !== "number" || typeof p.explanation !== "string") continue;

    const count = Math.min(recordCount, Math.max(1, Math.round(p.count)));
    seen.add(name);
    patterns.push({ name, count, explanation: p.explanation.trim().slice(0, 400) });
  }
  return patterns.sort((a, b) => b.count - a.count).slice(0, 4);
}

// AI replies can take 20-30 seconds; without this, hosts such as Vercel stop
// the request at their default limit (about 10 seconds on the free plan).
export const maxDuration = 60;

export async function POST(
  request: Request,
): Promise<NextResponse<AnalyzePatternsResponse | ApiError>> {
  const caller = await getCaller(request);
  if (caller.error) return caller.error;

  const body = await readBody(request);
  const thoughts = toThoughts(body?.thoughts);
  if (thoughts.length === 0) return jsonError("thoughts must contain at least one record", 400);

  const blocked = crisisGate(thoughts.flatMap((t) => [t.hotThought, t.automaticThoughts]));
  if (blocked) return blocked;

  try {
    const { data } = await generateJson(patternsPrompt(thoughts));
    // An empty list is a valid answer: nothing stood out.
    return NextResponse.json({ patterns: toPatterns(data, thoughts.length) });
  } catch (error) {
    return aiFailure("analyze-patterns", error);
  }
}
