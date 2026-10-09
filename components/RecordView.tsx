"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CrisisBanner } from "@/components/CrisisBanner";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { MoodChip } from "@/components/MoodChip";
import { CRISIS_RESOURCES } from "@/lib/crisis";
import { formatDate } from "@/lib/format";
import { loadGuestRecords } from "@/lib/guest-records";
import type { Mood, SimilarRecord, ThoughtRecord } from "@/types";

function Column({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="past-col">
      <p className="past-col-label">{label}</p>
      {children}
    </div>
  );
}

function Text({ value }: { value: string }) {
  return <p className="past-col-text">{value.trim() || "—"}</p>;
}

function Moods({ moods }: { moods: Mood[] }) {
  if (moods.length === 0) return <Text value="" />;
  return (
    <div className="mood-row mt-1">
      {moods.map((mood) => (
        <MoodChip key={mood.emotion} mood={mood} showAi />
      ))}
    </div>
  );
}

interface RecordViewProps {
  /** Signed-in: the record and its similar match, fetched on the server. */
  serverRecord?: ThoughtRecord;
  serverSimilar?: SimilarRecord | null;
  /** Guest: the id to look up in this browser session. */
  guestId?: string;
}

export function RecordView({ serverRecord, serverSimilar, guestId }: RecordViewProps) {
  const [guest, setGuest] = useState<{
    record?: ThoughtRecord;
    similar?: SimilarRecord | null;
  } | null>(null);

  useEffect(() => {
    if (!guestId) return;
    const all = loadGuestRecords();
    const record = all.find((r) => r.id === guestId);
    setGuest({ record, similar: all.find((r) => r.id === record?.similar_record_id) ?? null });
  }, [guestId]);

  const record = serverRecord ?? guest?.record;
  const similar = serverRecord ? serverSimilar : guest?.similar;

  if (!record) {
    return (
      <>
        <AppHeader title="Thought record" backHref="/dashboard" />
        <main className="content">
          {guestId && guest && (
            <p className="text-sm leading-relaxed text-text3">
              This record isn&apos;t available. Without an account, records are cleared when the
              tab they were made in is closed.
            </p>
          )}
        </main>
      </>
    );
  }

  const hasAiMoods = [...record.moods, ...record.outcome_moods].some((m) => m.ai_suggested);

  return (
    <>
      <AppHeader
        title="Thought record"
        subtitle={`${formatDate(record.created_at)} · ${record.is_complete ? "Completed" : "In progress"}`}
        backHref="/dashboard"
      />

      <main className="content">
        {record.crisis_flagged && <CrisisBanner resources={CRISIS_RESOURCES} />}

        {similar?.balanced_thought.trim() && (
          <Link href={`/record/${similar.id}`} className="aff-card">
            <p className="aff-label">⚡ Similar situation — your past balanced thought</p>
            <p className="aff-text">“{similar.balanced_thought}”</p>
            <p className="aff-date">From your {formatDate(similar.created_at)} record</p>
          </Link>
        )}

        {/* Stacked cards on phones; the seven-column worksheet on wide screens. */}
        <div className="record-table">
        <Column label="1. Situation">
          <Text value={record.situation} />
        </Column>
        <Column label="2. Moods">
          <Moods moods={record.moods} />
        </Column>
        <Column label="3. Automatic thoughts">
          <Text value={record.automatic_thoughts} />
          <p className="past-col-label mt-3">Hot thought</p>
          <Text value={record.hot_thought} />
        </Column>
        <Column label="4. Evidence for">
          <Text value={record.evidence_for} />
        </Column>
        <Column label="5. Evidence against">
          <Text value={record.evidence_against} />
        </Column>
        <Column label="6. Balanced thought">
          <Text value={record.balanced_thought} />
          {record.balanced_belief !== null && (
            <p className="mt-1.5 text-xs text-text3">
              Belief in this thought: {record.balanced_belief}%
            </p>
          )}
        </Column>
        <Column label="7. Moods now">
          <Moods moods={record.outcome_moods} />
        </Column>
        </div>

        {hasAiMoods && <p className="mt-2 text-[11px] text-text3">
            <span className="ai-spark">✦</span> Suggested by AI
          </p>}

        {/* Buttons on the left; on wide screens the credit sits at the right end of the same row. */}
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div className="md:flex md:w-full md:max-w-lg md:gap-3">
            <Link
              href={`/record/new?resume=${record.id}`}
              className="btn btn-primary mt-4 md:mt-2"
            >
              {record.is_complete ? "Edit this record" : "Continue this record"}
            </Link>
            <ExportPdfButton record={record} />
          </div>

          {/* Credit for the method. The app is independent of its authors. */}
          <p className="mt-6 max-w-md text-[11px] leading-relaxed text-text3 lg:mt-0 lg:text-right">
            The seven-column Thought Record was developed by Christine A. Padesky (1983) and
            appears in <cite>Mind Over Mood</cite>, Second Edition (Greenberger &amp; Padesky,
            2016). ReFrame7 is an independent tool and is not affiliated with or endorsed by the
            authors or publisher.
          </p>
        </div>
      </main>
    </>
  );
}
