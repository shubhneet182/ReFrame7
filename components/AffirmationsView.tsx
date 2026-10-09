"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { TabNav } from "@/components/TabNav";
import { formatDate, truncate } from "@/lib/format";
import { useRecords } from "@/lib/guest-records";
import type { ThoughtRecord } from "@/types";

// Shown only while the user has no balanced thoughts of their own.
const EXAMPLES = [
  "One difficult moment doesn't define my ability. I have handled hard things before.",
  "Feeling uncomfortable is not the same as being in danger.",
  "I can make a mistake and still be good at what I do.",
];

interface AffirmationsViewProps {
  signedIn: boolean;
  serverRecords: ThoughtRecord[] | null;
  loadError: boolean;
}

export function AffirmationsView({ signedIn, serverRecords, loadError }: AffirmationsViewProps) {
  const { records, ready } = useRecords(serverRecords);
  const affirmations = records.filter((r) => r.is_complete && r.balanced_thought.trim());
  const empty = ready && !loadError && affirmations.length === 0;

  return (
    <>
      <AppHeader title="Affirmations" subtitle="Your own balanced thoughts" tabs />

      <main className="content has-tabs">
        <p className="mb-3 text-xs leading-relaxed text-text3">
          The balanced thoughts from your completed records, in your own words.
          {!signedIn && " Without an account, they are kept until you close this tab."}
        </p>

        {loadError && (
          <p className="form-error mb-3" role="alert">
            Couldn&apos;t load your affirmations. Please try again.
          </p>
        )}

        {/* The start button sits at the top right, so a long list never pushes it away. */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="section-label mb-0">
            {affirmations.length > 0 ? "From your records" : empty ? "Examples of balanced thoughts" : ""}
          </h2>
          <Link href="/record/new" className="btn btn-primary mt-0 w-auto shrink-0 px-4 py-2">
            + Start new record
          </Link>
        </div>

        {/* Masonry: short thoughts stack up instead of leaving gaps beside long ones. */}
        <div className="masonry">
        {affirmations.map((affirmation) => (
          <Link key={affirmation.id} href={`/record/${affirmation.id}`} className="aff-card">
            <p className="aff-label">
              {truncate(affirmation.situation, 40)} · {formatDate(affirmation.created_at)}
            </p>
            <p className="aff-text">“{affirmation.balanced_thought}”</p>
            {affirmation.balanced_belief !== null && (
              <p className="aff-date">You believed this {affirmation.balanced_belief}%</p>
            )}
          </Link>
        ))}
        </div>

        {empty && (
          <>
            <p className="mb-3 text-sm leading-relaxed text-text3">
              Nothing of your own here yet. Each record you complete adds its balanced thought to
              this page.
            </p>
            <div className="masonry">
            {EXAMPLES.map((example) => (
              <div key={example} className="card">
                <p className="aff-label">Example — not from your records</p>
                <p className="aff-text">“{example}”</p>
              </div>
            ))}
            </div>
          </>
        )}

      </main>

      <TabNav />
    </>
  );
}
