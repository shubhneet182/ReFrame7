import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai";
import { detectCrisis } from "@/lib/crisis";
import { similarityPrompt } from "@/lib/prompts";
import { getSession, jsonError, readBody, textField } from "@/lib/route-helpers";
import { WORD_SIMILARITY_THRESHOLD, wordSimilarity } from "@/lib/similarity";
import type { ApiError, DetectSimilarityResponse, ThoughtRecord } from "@/types";

/** How many recent completed records are compared. */
const MAX_CANDIDATES = 20;

type Candidate = Pick<
  ThoughtRecord,
  "id" | "created_at" | "situation" | "hot_thought" | "balanced_thought"
>;

function byWords(situation: string, hotThought: string, candidates: Candidate[]): Candidate | null {
  const current = `${situation}\n${hotThought}`;
  let best: Candidate | null = null;
  let bestScore = WORD_SIMILARITY_THRESHOLD;

  for (const candidate of candidates) {
    const score = wordSimilarity(current, `${candidate.situation}\n${candidate.hot_thought}`);
    if (score >= bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

async function byAi(
  situation: string,
  hotThought: string,
  candidates: Candidate[],
): Promise<Candidate | null> {
  const { data } = await generateJson(similarityPrompt(situation, hotThought, candidates));
  const match = (data as { match?: unknown }).match;
  if (typeof match !== "number" || !Number.isInteger(match)) return null;
  return candidates[match - 1] ?? null;
}

export async function POST(
  request: Request,
): Promise<NextResponse<DetectSimilarityResponse | ApiError>> {
  const session = await getSession();
  if (!session) return jsonError("Not signed in", 401);

  const body = await readBody(request);
  const situation = textField(body?.situation);
  const hotThought = textField(body?.hotThought);
  if (!situation?.trim() || hotThought === null) {
    return jsonError("situation and hotThought are required", 400);
  }

  // RLS limits this to the signed-in user's own records.
  const { data, error } = await session.supabase
    .from("thought_records")
    .select("id, created_at, situation, hot_thought, balanced_thought")
    .eq("is_complete", true)
    .neq("balanced_thought", "")
    .order("created_at", { ascending: false })
    .limit(MAX_CANDIDATES)
    .returns<Candidate[]>();

  if (error) {
    console.error("[detect-similarity]", error.message);
    return jsonError("Could not read past records", 500);
  }

  const candidates = (data ?? []).filter((c) => c.balanced_thought.trim());
  if (candidates.length === 0) return NextResponse.json({ similar: null });

  // AI judges meaning when the user has consented; otherwise (or if it fails)
  // fall back to word overlap, which never leaves the server.
  const useAi =
    session.preferences.ai_enabled === true && !detectCrisis(`${situation}\n${hotThought}`);

  let match: Candidate | null;
  if (useAi) {
    try {
      match = await byAi(situation, hotThought, candidates);
    } catch (aiError) {
      console.warn("[detect-similarity] AI comparison failed, using word overlap:", aiError);
      match = byWords(situation, hotThought, candidates);
    }
  } else {
    match = byWords(situation, hotThought, candidates);
  }

  return NextResponse.json({
    similar: match
      ? {
          id: match.id,
          created_at: match.created_at,
          situation: match.situation,
          balanced_thought: match.balanced_thought,
        }
      : null,
  });
}
