import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SignOutButton } from "@/components/SignOutButton";
import { TabNav } from "@/components/TabNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WelcomeTour } from "@/components/WelcomeTour";
import { formatDate, truncate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ThoughtRecord, UserPreferences } from "@/types";

export const metadata = { title: "Your thought records — ReFrame7" };

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  const preferences = user.user_metadata as UserPreferences;
  if (!preferences.privacy_accepted) redirect("/onboarding");

  const { data, error } = await supabase
    .from("thought_records")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ThoughtRecord[]>();

  if (error) console.error("[dashboard] Failed to load thought_records:", error.message);

  const records = data ?? [];
  const showTour = !error && records.length === 0 && !preferences.tour_seen;

  // Affirmation: the most recent record that matched a past one surfaces
  // that past record's balanced thought.
  const matched = records.find((r) => r.similar_record_id);
  const affirmation = matched
    ? records.find((r) => r.id === matched.similar_record_id && r.balanced_thought.trim())
    : undefined;

  return (
    <>
      <AppHeader
        title="ReFrame7"
        subtitle="Your thought records"
        actions={
          <>
            <ThemeToggle />
            <SignOutButton />
          </>
        }
      />

      <main className="content has-tabs">
        {affirmation && (
          <Link href={`/record/${affirmation.id}`} className="aff-card">
            <p className="aff-label">⚡ Similar situation — your past balanced thought</p>
            <p className="aff-text">“{affirmation.balanced_thought}”</p>
            <p className="aff-date">
              From {formatDate(affirmation.created_at)} record · {truncate(affirmation.situation, 40)}
            </p>
          </Link>
        )}

        {showTour && <WelcomeTour aiEnabled={preferences.ai_enabled === true} />}

        {!showTour && <h2 className="section-label mt-1">Recent records</h2>}

        {error && (
          <p className="form-error mb-3" role="alert">
            Couldn&apos;t load your records. Please try again.
          </p>
        )}

        {!error && !showTour && records.length === 0 && (
          <p className="mb-3 text-sm leading-relaxed text-text3">
            No records yet. Start your first one when something is weighing on you.
          </p>
        )}

        {records.map((record) => (
          <Link
            key={record.id}
            href={record.is_complete ? `/record/${record.id}` : `/record/new?resume=${record.id}`}
            className="card"
          >
            <p className="card-title">{truncate(record.situation) || "Untitled record"}</p>
            <p className="card-meta">
              {formatDate(record.created_at)} · {record.is_complete ? "Completed" : "In progress"}
            </p>
            <div className="mood-row">
              {record.moods.map((mood) => (
                <span key={mood.emotion} className="mood">
                  {mood.emotion} {mood.intensity}%
                </span>
              ))}
              <span className={`badge ${record.is_complete ? "badge-sage" : "badge-blue"}`}>
                {record.is_complete ? "Completed" : "In progress"}
              </span>
            </div>
          </Link>
        ))}

        {!showTour && (
          <Link href="/record/new" className="btn btn-primary">
            Start new record
          </Link>
        )}
      </main>

      <TabNav />
    </>
  );
}
