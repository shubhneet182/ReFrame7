import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai";
import { balancedPrompt } from "@/lib/prompts";
import { aiFailure, crisisGate, getCaller, jsonError, readBody, textField } from "@/lib/route-helpers";
import type { ApiError, GenerateBalancedResponse, Mood } from "@/types";

function toMoods(value: unknown): Mood[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (m): m is Mood =>
        typeof m?.emotion === "string" && m.emotion.length <= 40 && typeof m?.intensity === "number",
    )
    .slice(0, 20);
}

export async function POST(
  request: Request,
): Promise<NextResponse<GenerateBalancedResponse | ApiError>> {
  const caller = await getCaller(request);
  if (caller.error) return caller.error;

  const body = await readBody(request);
  const situation = textField(body?.situation);
  const automaticThoughts = textField(body?.automaticThoughts);
  const hotThought = textField(body?.hotThought);
  const evidenceFor = textField(body?.evidenceFor);
  const evidenceAgainst = textField(body?.evidenceAgainst);
  if (
    !situation?.trim() ||
    !hotThought?.trim() ||
    automaticThoughts === null ||
    evidenceFor === null ||
    evidenceAgainst === null
  ) {
    return jsonError("All columns are required (situation and hotThought must not be empty)", 400);
  }

  const blocked = crisisGate([
    situation,
    automaticThoughts,
    hotThought,
    evidenceFor,
    evidenceAgainst,
  ]);
  if (blocked) return blocked;

  try {
    const { data } = await generateJson(
      balancedPrompt({
        situation,
        moods: toMoods(body?.moods),
        automaticThoughts,
        hotThought,
        evidenceFor,
        evidenceAgainst,
      }),
    );
    const balancedThought = (data as { balancedThought?: unknown }).balancedThought;
    if (typeof balancedThought !== "string" || !balancedThought.trim()) {
      throw new Error("No balanced thought in AI reply");
    }
    return NextResponse.json({ balancedThought: balancedThought.trim() });
  } catch (error) {
    return aiFailure("generate-balanced", error);
  }
}
