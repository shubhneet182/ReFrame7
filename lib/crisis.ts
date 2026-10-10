import type { CrisisCheckResponse, CrisisResource } from "@/types";

// Keyword-level detection only: deliberately broad, so it will over-trigger
// rather than miss. Safe to run on the client so the banner works offline.
export const CRISIS_KEYWORDS = [
  "suicide",
  "suicidal",
  "kill myself",
  "killing myself",
  "end my life",
  "take my life",
  "end it all",
  "want to die",
  "wish i was dead",
  "wish i were dead",
  "better off dead",
  "better off without me",
  "no reason to live",
  "not worth living",
  "want to disappear",
  "not be here anymore",
  "hurt myself",
  "hurting myself",
  "harm myself",
  "self harm",
  "self-harm",
  "cut myself",
  "cutting myself",
  // Strong hopelessness, without naming self-harm.
  "what's the point of anything",
  "what's the point of any of it",
  "what is the point of anything",
  "what's the point of living",
  "no point in living",
  "no point in going on",
  "no point to anything",
  "nothing will ever get better",
  "nothing is ever going to get better",
  "never going to get better",
  "can't go on",
  "cannot go on",
  "can't do this anymore",
  "can't do this any more",
  "don't want to be here",
  "tired of living",
  "tired of being alive",
  "give up on everything",
] as const;

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "9-8-8 Suicide Crisis Helpline",
    contact: "Call or text 9-8-8",
    description: "Free, 24/7, anywhere in Canada.",
  },
  {
    name: "Kids Help Phone",
    contact: "Call 1-800-668-6868 or text CONNECT to 686868",
    description: "Free, 24/7 support for young people in Canada.",
  },
  {
    name: "Emergency services",
    contact: "Call 9-1-1",
    description: "If you or someone else is in immediate danger.",
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ");
}

export function detectCrisis(text: string): boolean {
  const normalized = normalize(text);
  return CRISIS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function checkCrisis(text: string): CrisisCheckResponse {
  const isCrisis = detectCrisis(text);
  return { isCrisis, resources: isCrisis ? CRISIS_RESOURCES : [] };
}
