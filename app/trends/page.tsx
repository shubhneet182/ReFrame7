import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { TabNav } from "@/components/TabNav";
import { createClient } from "@/lib/supabase/server";
import type { ThoughtRecord, UserPreferences } from "@/types";

export const metadata = { title: "Mood trends — ReFrame7" };

const DAYS = 30;
const MAX_EMOTIONS = 6;

type TrendRecord = Pick<ThoughtRecord, "id" | "moods" | "outcome_moods">;

interface Trend {
  emotion: string;
  before: number;
  after: number;
  count: number;
}

/** Average intensity before vs after, for emotions rated at both ends of a record. */
function buildTrends(records: TrendRecord[]): Trend[] {
  const totals = new Map<string, Trend>();

  for (const record of records) {
    for (const mood of record.moods) {
      const key = mood.emotion.trim().toLowerCase();
      const outcome = record.outcome_moods.find((m) => m.emotion.trim().toLowerCase() === key);
      if (!outcome) continue;

      const entry = totals.get(key) ?? { emotion: mood.emotion, before: 0, after: 0, count: 0 };
      entry.before += mood.intensity;
      entry.after += outcome.intensity;
      entry.count += 1;
      totals.set(key, entry);
    }
  }

  return Array.from(totals.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_EMOTIONS)
    .map((t) => ({
      ...t,
      before: Math.round(t.before / t.count),
      after: Math.round(t.after / t.count),
    }));
}

export default async function TrendsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  if (!(user.user_metadata as UserPreferences).privacy_accepted) redirect("/onboarding");

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("thought_records")
    .select("id, moods, outcome_moods")
    .eq("is_complete", true)
    .gte("created_at", since)
    .returns<TrendRecord[]>();

  if (error) console.error("[trends] Failed to load thought_records:", error.message);

  const records = data ?? [];
  const trends = buildTrends(records);

  return (
    <>
      <AppHeader
        title="Mood trends"
        subtitle={`Last ${DAYS} days · ${records.length} completed ${records.length === 1 ? "record" : "records"}`}
      />

      <main className="content has-tabs">
        {error && (
          <p className="form-error mb-3" role="alert">
            Couldn&apos;t load your trends. Please try again.
          </p>
        )}

        {!error && trends.length === 0 && (
          <p className="mb-3 text-sm leading-relaxed text-text3">
            No trends yet. Complete a record, including the final mood re-rating, and your before
            and after will show up here.
          </p>
        )}

        {trends.length > 0 && (
          <>
            <h2 className="section-label">Mood before vs after each record</h2>
            <p className="mb-3 text-xs text-text3">
              Average intensity before and after completing a record.
            </p>

            <div className="mb-3 flex gap-4 text-xs text-text3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-lavender" /> Before
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sage" /> After
              </span>
            </div>

            {trends.map((trend) => (
              <div key={trend.emotion} className="mb-3">
                <div className="trend-row">
                  <span className="trend-label">{trend.emotion}</span>
                  <span className="trend-bar-bg">
                    <span
                      className="trend-bar block bg-lavender"
                      style={{ width: `${trend.before}%` }}
                    />
                  </span>
                  <span className="trend-val">{trend.before}%</span>
                </div>
                <div className="trend-row">
                  <span className="trend-label" />
                  <span className="trend-bar-bg">
                    <span className="trend-bar block bg-sage" style={{ width: `${trend.after}%` }} />
                  </span>
                  <span className="trend-val">{trend.after}%</span>
                </div>
              </div>
            ))}
          </>
        )}

        <Link href="/record/new" className="btn btn-primary">
          Start a new record
        </Link>
      </main>

      <TabNav />
    </>
  );
}
