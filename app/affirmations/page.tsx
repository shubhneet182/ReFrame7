import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { TabNav } from "@/components/TabNav";
import { formatDate, truncate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ThoughtRecord, UserPreferences } from "@/types";

export const metadata = { title: "Affirmations — ReFrame7" };

type Affirmation = Pick<ThoughtRecord, "id" | "created_at" | "situation" | "balanced_thought">;

export default async function AffirmationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  if (!(user.user_metadata as UserPreferences).privacy_accepted) redirect("/onboarding");

  const { data, error } = await supabase
    .from("thought_records")
    .select("id, created_at, situation, balanced_thought")
    .eq("is_complete", true)
    .neq("balanced_thought", "")
    .order("created_at", { ascending: false })
    .returns<Affirmation[]>();

  if (error) console.error("[affirmations] Failed to load thought_records:", error.message);

  const affirmations = (data ?? []).filter((r) => r.balanced_thought.trim());

  return (
    <>
      <AppHeader title="Affirmations" subtitle="Your own balanced thoughts" />

      <main className="content has-tabs">
        <p className="mb-3 text-xs leading-relaxed text-text3">
          These are the balanced thoughts from your completed records, in your own words.
        </p>

        {error && (
          <p className="form-error mb-3" role="alert">
            Couldn&apos;t load your affirmations. Please try again.
          </p>
        )}

        {!error && affirmations.length === 0 && (
          <p className="mb-3 text-sm leading-relaxed text-text3">
            Nothing here yet. Each record you complete adds its balanced thought to this page.
          </p>
        )}

        {affirmations.length > 0 && <h2 className="section-label">From your past records</h2>}

        {affirmations.map((affirmation) => (
          <Link key={affirmation.id} href={`/record/${affirmation.id}`} className="aff-card">
            <p className="aff-label">
              {truncate(affirmation.situation, 40)} · {formatDate(affirmation.created_at)}
            </p>
            <p className="aff-text">“{affirmation.balanced_thought}”</p>
          </Link>
        ))}

        <Link href="/record/new" className="btn btn-primary">
          Start a new record
        </Link>
      </main>

      <TabNav />
    </>
  );
}
