import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai";
import { detectCrisis } from "@/lib/crisis";
import { similarityPrompt } from "@/lib/prompts";
import { getCaller, jsonError, readBody, textField } from "@/lib/route-helpers";
import { WORD_SIMILARITY_THRESHOLD, wordSimilarity } from "@/lib/similarity";
import type { ApiError, DetectSimilarityResponse, SimilarityCandidate } from "@/types";

/** How many recent completed records are compared. */
const MAX_CANDIDATES = 20;

/** Guests send their session records; keep only well-formed ones. */
function guestCandidates(value: unknown): SimilarityCandidate[] {
  if (!Array.isArray(value)) return [];
  const candidates: SimilarityCandidate[] = [];
  for (const item of value.slice(0, MAX_CANDIDATES)) {
    const c = (item ?? {}) as Record<string, unknown>;
    const situation = textField(c.situation);
    const hotThought = textField(c.hot_thought);
    const balanced = textField(c.balanced_thought);
    if (
      typeof c.id !== "string" ||
      typeof c.created_at !== "string" ||
      situation === null ||
      hotThought === null ||
      balanced === null
    ) {
      continue;
    }
    candidates.push({
      id: c.id,
      created_at: c.created_at,
      situation,
      hot_thought: hotThought,
      balanced_thought: balanced,
    });
  }
  return candidates;
}

function byWords(
  situation: string,
  hotThought: string,
  candidates: SimilarityCandidate[],
): SimilarityCandidate | null {
  const current = `${situation}\n${hotThought}`;
  let best: SimilarityCandidate | null = null;
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
  candidates: SimilarityCandidate[],
): Promise<SimilarityCandidate | null> {
  const { data } = await generateJson(similarityPrompt(situation, hotThought, candidates));
  const match = (data as { match?: unknown }).match;
  if (typeof match !== "number" || !Number.isInteger(match)) return null;
  return candidates[match - 1] ?? null;
}

// AI replies can take 20-30 seconds; without this, hosts such as Vercel stop
// the request at their default limit (about 10 seconds on the free plan).
export const maxDuration = 60;

export async function POST(
  request: Request,
): Promise<NextResponse<DetectSimilarityResponse | ApiError>> {
  const caller = await getCaller(request);
  if (caller.error) return caller.error;
  const { user, supabase } = caller.viewer;

  const body = await readBody(request);
  const situation = textField(body?.situation);
  const hotThought = textField(body?.hotThought);
  if (!situation?.trim() || hotThought === null) {
    return jsonError("situation and hotThought are required", 400);
  }

  let candidates: SimilarityCandidate[];
  if (user) {
    // RLS limits this to the signed-in user's own records.
    const { data, error } = await supabase
      .from("thought_records")
      .select("id, created_at, situation, hot_thought, balanced_thought")
      .eq("is_complete", true)
      .neq("balanced_thought", "")
      .order("created_at", { ascending: false })
      .limit(MAX_CANDIDATES)
      .returns<SimilarityCandidate[]>();

    if (error) {
      console.error("[detect-similarity]", error.message);
      return jsonError("Could not read past records", 500);
    }
    candidates = data ?? [];
  } else {
    candidates = guestCandidates(body?.candidates);
  }

  candidates = candidates.filter((c) => c.balanced_thought.trim());
  if (candidates.length === 0) return NextResponse.json({ similar: null });

  // AI judges meaning; in a possible crisis, or if it fails, fall back to
  // word overlap, which never leaves the server.
  let match: SimilarityCandidate | null;
  if (detectCrisis(`${situation}\n${hotThought}`)) {
    match = byWords(situation, hotThought, candidates);
  } else {
    try {
      match = await byAi(situation, hotThought, candidates);
    } catch (aiError) {
      console.warn("[detect-similarity] AI comparison failed, using word overlap:", aiError);
      match = byWords(situation, hotThought, candidates);
    }
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
