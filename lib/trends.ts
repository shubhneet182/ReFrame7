import type { Mood, ThoughtRecord } from "@/types";

export const TREND_DAYS = 30;
const MAX_EMOTIONS = 6;

export interface Trend {
  emotion: string;
  before: number;
  after: number;
  /** after − before, in percentage points. */
  change: number;
  /** How many records rated this emotion at both ends. */
  count: number;
}

export interface RecordTrend {
  id: string;
  created_at: string;
  situation: string;
  /** Average intensity across the moods rated at both ends, or null if none were. */
  before: number | null;
  after: number | null;
  belief: number | null;
}

export interface TrendSummary {
  records: number;
  /** Average change across every mood rated before and after, in points. */
  averageChange: number | null;
  averageBelief: number | null;
  /** The emotion whose intensity fell the most on average. */
  mostEased: Trend | null;
}

export function recentCompleted(records: ThoughtRecord[]): ThoughtRecord[] {
  const since = Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000;
  return records.filter((r) => r.is_complete && new Date(r.created_at).getTime() >= since);
}

const keyOf = (mood: Mood) => mood.emotion.trim().toLowerCase();
const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;

/** Moods rated at both the start and the end of a record. */
function pairs(record: ThoughtRecord): { emotion: string; before: number; after: number }[] {
  return record.moods.flatMap((mood) => {
    const outcome = record.outcome_moods.find((m) => keyOf(m) === keyOf(mood));
    return outcome
      ? [{ emotion: mood.emotion, before: mood.intensity, after: outcome.intensity }]
      : [];
  });
}

/** Average intensity before vs after per emotion, most frequent first. */
export function buildTrends(records: ThoughtRecord[]): Trend[] {
  const totals = new Map<string, { emotion: string; before: number; after: number; count: number }>();

  for (const record of records) {
    for (const pair of pairs(record)) {
      const key = pair.emotion.trim().toLowerCase();
      const entry = totals.get(key) ?? { emotion: pair.emotion, before: 0, after: 0, count: 0 };
      entry.before += pair.before;
      entry.after += pair.after;
      entry.count += 1;
      totals.set(key, entry);
    }
  }

  return Array.from(totals.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_EMOTIONS)
    .map((t) => {
      const before = Math.round(t.before / t.count);
      const after = Math.round(t.after / t.count);
      return { emotion: t.emotion, before, after, change: after - before, count: t.count };
    });
}

/** One row per record, newest first. */
export function buildRecordTrends(records: ThoughtRecord[]): RecordTrend[] {
  return [...records]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((record) => {
      const rated = pairs(record);
      return {
        id: record.id,
        created_at: record.created_at,
        situation: record.situation,
        before: average(rated.map((p) => p.before)),
        after: average(rated.map((p) => p.after)),
        belief: record.balanced_belief,
      };
    });
}

export function summarize(records: ThoughtRecord[], trends: Trend[]): TrendSummary {
  const changes = records.flatMap((r) => pairs(r).map((p) => p.after - p.before));
  const beliefs = records
    .map((r) => r.balanced_belief)
    .filter((belief): belief is number => belief !== null);

  const eased = trends.filter((t) => t.change < 0).sort((a, b) => a.change - b.change)[0];

  return {
    records: records.length,
    averageChange: average(changes),
    averageBelief: average(beliefs),
    mostEased: eased ?? null,
  };
}
