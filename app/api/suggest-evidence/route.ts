import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai";
import { evidencePrompt } from "@/lib/prompts";
import { aiCrisisFlag, aiFailure, crisisGate, getCaller, jsonError, readBody, textField } from "@/lib/route-helpers";
import type { ApiError, SuggestEvidenceResponse } from "@/types";

const MAX_QUESTIONS = 5;

function toQuestions(data: unknown): string[] {
  const raw = (data as { questions?: unknown }).questions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q): q is string => typeof q === "string")
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, MAX_QUESTIONS);
}

// AI replies can take 20-30 seconds; without this, hosts such as Vercel stop
// the request at their default limit (about 10 seconds on the free plan).
export const maxDuration = 60;

export async function POST(
  request: Request,
): Promise<NextResponse<SuggestEvidenceResponse | ApiError>> {
  const caller = await getCaller(request);
  if (caller.error) return caller.error;

  const body = await readBody(request);
  const situation = textField(body?.situation);
  const hotThought = textField(body?.hotThought);
  const column = body?.column;
  if (!situation?.trim() || !hotThought?.trim() || (column !== 4 && column !== 5)) {
    return jsonError("situation, hotThought and column (4 or 5) are required", 400);
  }

  const blocked = crisisGate([situation, hotThought]);
  if (blocked) return blocked;

  try {
    const { data } = await generateJson(evidencePrompt(situation, hotThought, column));
    const flagged = aiCrisisFlag(data);
    if (flagged) return flagged;
    const questions = toQuestions(data);
    if (questions.length === 0) throw new Error("No usable questions in AI reply");
    return NextResponse.json({ questions });
  } catch (error) {
    return aiFailure("suggest-evidence", error);
  }
}
