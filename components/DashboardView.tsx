"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { ImportGuestRecords } from "@/components/ImportGuestRecords";
import { SignOutButton } from "@/components/SignOutButton";
import { TabNav } from "@/components/TabNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TOUR_SEEN_KEY, WelcomeTour } from "@/components/WelcomeTour";
import { formatDate, truncate } from "@/lib/format";
import { useRecords } from "@/lib/guest-records";
import type { ThoughtRecord } from "@/types";

interface DashboardViewProps {
  /** Null for a guest. */
  userId: string | null;
  /** The account's records, or null for a guest (read from the session instead). */
  serverRecords: ThoughtRecord[] | null;
  loadError: boolean;
  /** Signed-in users only; guests remember it on the device. */
  tourSeen: boolean;
}

export function DashboardView({ userId, serverRecords, loadError, tourSeen }: DashboardViewProps) {
  const signedIn = userId !== null;
  const { records, ready } = useRecords(serverRecords);

  const [tourDismissed, setTourDismissed] = useState(tourSeen);
  useEffect(() => {
    if (signedIn) return;
    try {
      setTourDismissed(localStorage.getItem(TOUR_SEEN_KEY) === "1");
    } catch {
      setTourDismissed(false);
    }
  }, [signedIn]);

  const showTour = ready && !loadError && records.length === 0 && !tourDismissed;

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
        tabs
        actions={
          <>
            <ThemeToggle />
            {signedIn ? (
              <SignOutButton />
            ) : (
              <Link href="/auth/login" className="icon-btn">
                Sign in
              </Link>
            )}
          </>
        }
      />

      <main className="content has-tabs">
        {signedIn && <ImportGuestRecords userId={userId} />}

        {!signedIn && ready && !showTour && (
          <p className="guest-note">
            You&apos;re using ReFrame7 without an account, so your records are kept in this tab
            only and are cleared when you close it.{" "}
            <Link href="/auth/register" className="text-blue underline">
              Create a free account
            </Link>{" "}
            to keep them.
          </p>
        )}

        {affirmation && (
          <Link href={`/record/${affirmation.id}`} className="aff-card">
            <p className="aff-label">⚡ Similar situation — your past balanced thought</p>
            <p className="aff-text">“{affirmation.balanced_thought}”</p>
            <p className="aff-date">
              From {formatDate(affirmation.created_at)} record · {truncate(affirmation.situation, 40)}
            </p>
          </Link>
        )}

        {showTour && (
          <div className="narrow">
            <WelcomeTour signedIn={signedIn} onClose={() => setTourDismissed(true)} />
          </div>
        )}

        {!showTour && <h2 className="section-label mt-1">Recent records</h2>}

        {loadError && (
          <p className="form-error mb-3" role="alert">
            Couldn&apos;t load your records. Please try again.
          </p>
        )}

        {ready && !loadError && !showTour && records.length === 0 && (
          <p className="mb-3 text-sm leading-relaxed text-text3">
            No records yet. Start your first one when something is weighing on you.
          </p>
        )}

        <div className="card-grid">
        {records.map((record) => (
          <article key={record.id} className="card">
            <Link
              href={
                record.is_complete ? `/record/${record.id}` : `/record/new?resume=${record.id}`
              }
              className="block"
            >
              <p className="card-title">{truncate(record.situation) || "Untitled record"}</p>
              <p className="card-meta">{formatDate(record.created_at)}</p>
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

            <div className="card-actions">
              {record.is_complete ? (
                <>
                  <Link href={`/record/${record.id}`} className="card-action">
                    View
                  </Link>
                  <Link href={`/record/new?resume=${record.id}`} className="card-action">
                    Edit
                  </Link>
                  <ExportPdfButton record={record} compact />
                </>
              ) : (
                <Link href={`/record/new?resume=${record.id}`} className="card-action">
                  Continue
                </Link>
              )}
            </div>
          </article>
        ))}
        </div>

        {!showTour && (
          <Link href="/record/new" className="btn btn-primary md:max-w-xs">
            Start new record
          </Link>
        )}
      </main>

      <TabNav />
    </>
  );
}
