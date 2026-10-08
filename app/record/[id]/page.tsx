import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CrisisBanner } from "@/components/CrisisBanner";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { CRISIS_RESOURCES } from "@/lib/crisis";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Mood, SimilarRecord, ThoughtRecord } from "@/types";

export const metadata = { title: "Thought record — ReFrame7" };

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

export default async function RecordPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: record } = await supabase
    .from("thought_records")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<ThoughtRecord>();

  if (!record) notFound();

  let similar: SimilarRecord | null = null;
  if (record.similar_record_id) {
    const { data } = await supabase
      .from("thought_records")
      .select("id, created_at, situation, balanced_thought")
      .eq("id", record.similar_record_id)
      .maybeSingle<SimilarRecord>();
    similar = data;
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

        <Column label="Column 1 — Situation">
          <Text value={record.situation} />
        </Column>
        <Column label="Column 2 — Moods">
          <Moods moods={record.moods} />
        </Column>
        <Column label="Column 3 — Automatic thoughts">
          <Text value={record.automatic_thoughts} />
        </Column>
        <Column label="Hot thought">
          <Text value={record.hot_thought} />
        </Column>
        <Column label="Column 4 — Evidence for">
          <Text value={record.evidence_for} />
        </Column>
        <Column label="Column 5 — Evidence against">
          <Text value={record.evidence_against} />
        </Column>
        <Column label="Column 6 — Balanced thought">
          <Text value={record.balanced_thought} />
        </Column>

        {record.balanced_thought_ai && (
          <div className="ai-suggestion">
            <p className="ai-tag">✦ AI-generated suggestion offered for this record</p>
            <p className="ai-suggestion-text">{record.balanced_thought_ai}</p>
          </div>
        )}

        <Column label="Column 7 — Outcome moods">
          <Moods moods={record.outcome_moods} />
        </Column>

        {hasAiMoods && <p className="mt-2 text-[11px] text-text3">✦ Suggested by AI</p>}

        {!record.is_complete && (
          <Link href={`/record/new?resume=${record.id}`} className="btn btn-primary mt-4">
            Continue this record
          </Link>
        )}
        <ExportPdfButton record={record} />
      </main>
    </>
  );
}
