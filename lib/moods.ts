import type { Mood } from "@/types";

/** Offered as one-tap choices on the moods step, with or without AI. */
export const COMMON_MOODS = [
  "Anxious",
  "Sad",
  "Angry",
  "Frustrated",
  "Overwhelmed",
  "Ashamed",
  "Guilty",
  "Hurt",
  "Lonely",
  "Afraid",
  "Embarrassed",
  "Disappointed",
  "Hopeless",
  "Jealous",
];

/** The mood the user chose to examine, if any. */
export function examinedMood(moods: Mood[]): Mood | undefined {
  return moods.find((m) => m.examine);
}

/** Marks one mood as the one to examine, clearing the mark from the rest. */
export function examine(moods: Mood[], emotion: string): Mood[] {
  return moods.map((m) => ({ ...m, examine: m.emotion === emotion }));
}

/**
 * The moods to re-rate at the end of a record: every mood from column 2 (in
 * the same order, keeping any rating already given), then any new moods the
 * user added at the end.
 */
export function outcomeFrom(moods: Mood[], outcome: Mood[]): Mood[] {
  const key = (m: Mood) => m.emotion.trim().toLowerCase();
  const rated = new Map(outcome.map((m) => [key(m), m]));
  const original = new Set(moods.map(key));

  return [
    ...moods.map((m) => ({ ...m, intensity: rated.get(key(m))?.intensity ?? m.intensity })),
    ...outcome.filter((m) => !original.has(key(m))).map((m) => ({ ...m, examine: false })),
  ];
}

/** A lone mood is the one being examined; with several, the user chooses. */
export function ensureExamined(moods: Mood[]): Mood[] {
  if (moods.length !== 1 || moods[0].examine) return moods;
  return [{ ...moods[0], examine: true }];
}
