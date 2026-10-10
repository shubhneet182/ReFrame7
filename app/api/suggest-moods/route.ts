import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai";
import { moodsPrompt } from "@/lib/prompts";
import { aiCrisisFlag, aiFailure, crisisGate, getCaller, jsonError, readBody, textField } from "@/lib/route-helpers";
import type { ApiError, Mood, SuggestMoodsResponse } from "@/types";

const MAX_MOODS = 6;

function toMoods(data: unknown): Mood[] {
  const raw = (data as { moods?: unknown }).moods;
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const moods: Mood[] = [];
  for (const item of raw) {
    const { emotion, intensity } = (item ?? {}) as { emotion?: unknown; intensity?: unknown };
    if (typeof emotion !== "string" || typeof intensity !== "number") continue;

    const name = emotion.trim().slice(0, 40);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);

    moods.push({
      emotion: name,
      intensity: Math.min(100, Math.max(0, Math.round(intensity / 5) * 5)),
      ai_suggested: true,
    });
  }
  return moods.slice(0, MAX_MOODS);
}

// AI replies can take 20-30 seconds; without this, hosts such as Vercel stop
// the request at their default limit (about 10 seconds on the free plan).
export const maxDuration = 60;

export async function POST(
  request: Request,
): Promise<NextResponse<SuggestMoodsResponse | ApiError>> {
  const caller = await getCaller(request);
  if (caller.error) return caller.error;

  const body = await readBody(request);
  const situation = textField(body?.situation);
  const automaticThought = textField(body?.automaticThought);
  if (!situation?.trim() || automaticThought === null) {
    return jsonError("situation and automaticThought are required", 400);
  }

  const blocked = crisisGate([situation, automaticThought]);
  if (blocked) return blocked;

  try {
    const { data } = await generateJson(moodsPrompt(situation, automaticThought));
    const flagged = aiCrisisFlag(data);
    if (flagged) return flagged;
    const moods = toMoods(data);
    if (moods.length === 0) throw new Error("No usable moods in AI reply");
    return NextResponse.json({ moods });
  } catch (error) {
    return aiFailure("suggest-moods", error);
  }
}
