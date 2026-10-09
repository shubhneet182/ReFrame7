"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppName } from "@/components/AppName";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { ExportAllPdfButton } from "@/components/ExportAllPdfButton";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { ImportGuestRecords } from "@/components/ImportGuestRecords";
import { MoodChip } from "@/components/MoodChip";
import { SignOutButton } from "@/components/SignOutButton";
import { TabNav } from "@/components/TabNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TOUR_SEEN_KEY, tourIndexFor, WelcomeTour } from "@/components/WelcomeTour";
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
  const router = useRouter();
  const { records: loaded, ready } = useRecords(serverRecords);
  // Hide a deleted record straight away, before the list is reloaded.
  const [deleted, setDeleted] = useState<string[]>([]);
  const records = loaded.filter((r) => !deleted.includes(r.id));

  function onDeleted(id: string) {
    setDeleted((ids) => [...ids, id]);
    if (signedIn) router.refresh();
  }

  const [tourDismissed, setTourDismissed] = useState(tourSeen);
  useEffect(() => {
    if (signedIn) return;
    try {
      setTourDismissed(localStorage.getItem(TOUR_SEEN_KEY) === "1");
    } catch {
      setTourDismissed(false);
    }
  }, [signedIn]);

  // Opens by itself on a first visit, and again whenever the "?" button is pressed.
  const [tourRequested, setTourRequested] = useState(false);
  const [tourStart, setTourStart] = useState(0);

  // Coming back from the record page part of the tour: carry on where it left off.
  useEffect(() => {
    const resumeAt = tourIndexFor("/dashboard");
    if (resumeAt !== null) {
      setTourStart(resumeAt);
      setTourRequested(true);
    }
  }, []);
  const showTour =
    tourRequested || (ready && !loadError && records.length === 0 && !tourDismissed);

  function closeTour() {
    setTourDismissed(true);
    setTourRequested(false);
  }

  // Affirmation: the most recent record that matched a past one surfaces
  // that past record's balanced thought.
  const matched = records.find((r) => r.similar_record_id);
  const affirmation = matched
    ? records.find((r) => r.id === matched.similar_record_id && r.balanced_thought.trim())
    : undefined;

  return (
    <>
      <AppHeader
        title={<AppName />}
        subtitle="Your thought records"
        tabs
        actions={
          <>
            <button
              type="button"
              className="icon-btn w-9 px-0 text-sm font-semibold"
              onClick={() => {
                setTourStart(0);
                setTourRequested(true);
              }}
              aria-label="Take the tour"
              title="Take the tour"
            >
              ?
            </button>
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

        {!signedIn && ready && (
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

        {/* With records, the start button sits at the top right so a long list
            never pushes it out of reach. */}
        <div className="mb-2 mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="section-label mb-0">Recent records</h2>
          {records.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <ExportAllPdfButton records={records} />
              <Link
                href="/record/new"
                className="btn btn-primary mt-0 w-auto shrink-0 px-4 py-2"
                data-tour="start"
              >
                + Start new record
              </Link>
            </div>
          )}
        </div>

        {loadError && (
          <p className="form-error mb-3" role="alert">
            Couldn&apos;t load your records. Please try again.
          </p>
        )}

        {ready && !loadError && records.length === 0 && (
          <div className="empty-state">
            <p className="text-sm leading-relaxed text-text3">
              No records yet. Start your first one when something is weighing on you.
            </p>
            <Link href="/record/new" className="btn btn-primary mt-4 max-w-xs" data-tour="start">
              Start new record
            </Link>
          </div>
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
                  <MoodChip key={mood.emotion} mood={mood} />
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
              <DeleteRecordButton record={record} signedIn={signedIn} onDeleted={onDeleted} />
            </div>
          </article>
        ))}
        </div>

        {loadError && (
          <Link href="/record/new" className="btn btn-primary md:max-w-xs">
            Start new record
          </Link>
        )}
      </main>

      {/* First visit: a walkthrough points at the tabs and the start button. */}
      {showTour && (
        <WelcomeTour
          route="/dashboard"
          startIndex={tourStart}
          signedIn={signedIn}
          onClose={closeTour}
        />
      )}

      <TabNav />
    </>
  );
}
