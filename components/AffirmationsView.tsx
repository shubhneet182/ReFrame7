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

        {affirmations.length > 0 && <h2 className="section-label">From your records</h2>}

        <div className="card-grid">
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
            <h2 className="section-label">Examples of balanced thoughts</h2>
            <div className="card-grid">
            {EXAMPLES.map((example) => (
              <div key={example} className="card">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text3">
                  Example — not from your records
                </p>
                <p className="text-sm italic leading-relaxed text-text2">“{example}”</p>
              </div>
            ))}
            </div>
          </>
        )}

        <Link href="/record/new" className="btn btn-primary md:max-w-xs">
          Start a new record
        </Link>
      </main>

      <TabNav />
    </>
  );
}
