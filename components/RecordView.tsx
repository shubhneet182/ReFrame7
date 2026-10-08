"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CrisisBanner } from "@/components/CrisisBanner";
import { ExportPdfButton } from "@/components/ExportPdfButton";
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
        <span key={mood.emotion} className="mood">
          {mood.emotion} {mood.intensity}%{mood.ai_suggested ? " ✦" : ""}
        </span>
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

        {record.balanced_thought_ai && (
          <div className="ai-suggestion">
            <p className="ai-tag">✦ AI-generated suggestion offered for this record</p>
            <p className="ai-suggestion-text">{record.balanced_thought_ai}</p>
          </div>
        )}

        {hasAiMoods && <p className="mt-2 text-[11px] text-text3">✦ Suggested by AI</p>}

        <div className="md:flex md:max-w-lg md:gap-3">
          <Link href={`/record/new?resume=${record.id}`} className="btn btn-primary mt-4 md:mt-2">
            {record.is_complete ? "Edit this record" : "Continue this record"}
          </Link>
          <ExportPdfButton record={record} />
        </div>
      </main>
    </>
  );
}
