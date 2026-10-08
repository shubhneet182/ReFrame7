"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { TabNav } from "@/components/TabNav";
import { postJson } from "@/lib/api";
import { detectCrisis } from "@/lib/crisis";
import { formatDate, truncate } from "@/lib/format";
import { useRecords } from "@/lib/guest-records";
import {
  buildRecordTrends,
  buildTrends,
  recentCompleted,
  summarize,
  TREND_DAYS,
} from "@/lib/trends";
import type {
  AnalyzePatternsRequest,
  AnalyzePatternsResponse,
  ThinkingPattern,
  ThoughtRecord,
} from "@/types";

const PATTERNS_KEY = "rf7_patterns";

/** "↓ 38 pts", "↑ 5 pts" or "No change". Points are of mood intensity (0–100). */
function formatChange(change: number): string {
  if (change === 0) return "No change";
  return `${change < 0 ? "↓" : "↑"} ${Math.abs(change)} pts`;
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="stat-tile">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {note && <p className="stat-note">{note}</p>}
    </div>
  );
}

interface TrendsViewProps {
  signedIn: boolean;
  serverRecords: ThoughtRecord[] | null;
  loadError: boolean;
}

export function TrendsView({ signedIn, serverRecords, loadError }: TrendsViewProps) {
  const { records, ready } = useRecords(serverRecords);
  const completed = recentCompleted(records);
  const trends = buildTrends(completed);
  const summary = summarize(completed, trends);
  const rows = buildRecordTrends(completed);

  // The AI pattern analysis is asked for explicitly and remembered for this
  // set of records, so revisiting the page doesn't spend another request.
  const recordsKey = completed.map((r) => `${r.id}:${r.updated_at}`).join("|");
  const [patterns, setPatterns] = useState<ThinkingPattern[] | null>(null);
  const [patternState, setPatternState] = useState<"idle" | "loading" | "failed">("idle");

  useEffect(() => {
    setPatterns(null);
    try {
      const saved = JSON.parse(sessionStorage.getItem(PATTERNS_KEY) ?? "null") as {
        key: string;
        patterns: ThinkingPattern[];
      } | null;
      if (saved && saved.key === recordsKey) setPatterns(saved.patterns);
    } catch {
      // No saved analysis.
    }
  }, [recordsKey]);

  const crisis = completed.some((r) => detectCrisis(`${r.hot_thought}\n${r.automatic_thoughts}`));

  async function analysePatterns() {
    setPatternState("loading");
    const result = await postJson<AnalyzePatternsRequest, AnalyzePatternsResponse>(
      "/api/analyze-patterns",
      {
        thoughts: completed
          .filter((r) => r.hot_thought.trim())
          .map((r) => ({ hotThought: r.hot_thought, automaticThoughts: r.automatic_thoughts })),
      },
    );
    if (!result) return setPatternState("failed");

    setPatterns(result.patterns);
    setPatternState("idle");
    try {
      sessionStorage.setItem(
        PATTERNS_KEY,
        JSON.stringify({ key: recordsKey, patterns: result.patterns }),
      );
    } catch {
      // It will simply be asked for again next time.
    }
  }

  const count = completed.length;
  const plural = count === 1 ? "record" : "records";

  return (
    <>
      <AppHeader
        title="Mood trends"
        tabs
        subtitle={
          signedIn
            ? `Last ${TREND_DAYS} days · ${count} completed ${plural}`
            : `This session · ${count} completed ${plural}`
        }
      />

      <main className="content has-tabs">
        {loadError && (
          <p className="form-error mb-3" role="alert">
            Couldn&apos;t load your trends. Please try again.
          </p>
        )}

        {ready && !loadError && count === 0 && (
          <p className="mb-3 text-sm leading-relaxed text-text3">
            No trends yet. Complete a record, including the final mood re-rating, and your before
            and after will show up here.
            {!signedIn && " Without an account, trends cover the records made in this tab."}
          </p>
        )}

        {count > 0 && (
          <>
            <div className="stat-row">
              <StatTile label="Completed records" value={String(count)} />
              <StatTile
                label="Average mood change"
                value={summary.averageChange === null ? "—" : formatChange(summary.averageChange)}
                note="Intensity after vs before a record"
              />
              <StatTile
                label="Belief in balanced thoughts"
                value={summary.averageBelief === null ? "—" : `${summary.averageBelief}%`}
                note="Average of your ratings"
              />
              <StatTile
                label="Mood that eased most"
                value={summary.mostEased?.emotion ?? "—"}
                note={summary.mostEased ? formatChange(summary.mostEased.change) : undefined}
              />
            </div>

            {trends.length > 0 && (
              <section className="mt-6">
                <h2 className="section-label">Mood before vs after each record</h2>
                <p className="mb-3 text-xs text-text3">
                  Average intensity before and after completing a record, for moods you rated at
                  both ends.
                </p>

                <div className="mb-3 flex gap-4 text-xs text-text3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-lavender" /> Before
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-sage" /> After
                  </span>
                </div>

                <div className="trend-grid">
                  {trends.map((trend) => (
                    <div key={trend.emotion} className="mb-4">
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-text">{trend.emotion}</span>
                        <span className="text-xs text-text3">
                          {formatChange(trend.change)} · {trend.count}{" "}
                          {trend.count === 1 ? "record" : "records"}
                        </span>
                      </div>
                      <div className="trend-row">
                        <span className="trend-bar-bg">
                          <span
                            className="trend-bar block bg-lavender"
                            style={{ width: `${trend.before}%` }}
                          />
                        </span>
                        <span className="trend-val">{trend.before}%</span>
                      </div>
                      <div className="trend-row">
                        <span className="trend-bar-bg">
                          <span
                            className="trend-bar block bg-sage"
                            style={{ width: `${trend.after}%` }}
                          />
                        </span>
                        <span className="trend-val">{trend.after}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-6">
              <h2 className="section-label">Thinking patterns</h2>

              {patterns === null && (
                <>
                  <p className="mb-2 text-xs leading-relaxed text-text3">
                    AI can read the thoughts in your completed records and point out thinking
                    habits that come up more than once.
                  </p>
                  {crisis ? (
                    <p className="text-xs leading-relaxed text-text3">
                      This is paused because one of your records mentions thoughts of self-harm.
                      If that is how you are feeling, please call or text 9-8-8.
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="ai-btn md:max-w-sm"
                      onClick={analysePatterns}
                      disabled={patternState === "loading"}
                    >
                      <span className="ai-dot">✦</span>
                      {patternState === "loading"
                        ? "Reading your records…"
                        : "Look for thinking patterns with AI"}
                    </button>
                  )}
                  {patternState === "failed" && (
                    <p className="form-error" role="status">
                      AI couldn&apos;t do this just now. Please try again in a moment.
                    </p>
                  )}
                </>
              )}

              {patterns !== null && (
                <>
                  <p className="ai-tag">
                    ✦ AI-generated from {count} {plural} — a prompt for reflection, not a diagnosis
                  </p>
                  {patterns.length === 0 && (
                    <p className="text-sm leading-relaxed text-text3">
                      No pattern stood out across these records.
                    </p>
                  )}
                  <div className="card-grid">
                    {patterns.map((pattern) => (
                      <div key={pattern.name} className="ai-suggestion my-0">
                        <p className="text-sm font-medium text-text">{pattern.name}</p>
                        <p className="mb-1.5 text-xs text-text3">
                          Appears in {pattern.count} of {count} {plural}
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--ai-text)" }}>
                          {pattern.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="mt-6">
              <h2 className="section-label">Record by record</h2>
              <div className="trend-table" role="table" aria-label="Mood change for each record">
                <div className="trend-table-head" role="row">
                  <span role="columnheader">Date</span>
                  <span role="columnheader">Situation</span>
                  <span role="columnheader">Mood before → after</span>
                  <span role="columnheader">Belief</span>
                </div>
                {rows.map((row) => (
                  <Link
                    key={row.id}
                    href={`/record/${row.id}`}
                    className="trend-table-row"
                    role="row"
                  >
                    <span role="cell" className="text-text3">
                      {formatDate(row.created_at)}
                    </span>
                    <span role="cell" className="text-text">
                      {truncate(row.situation, 70) || "Untitled record"}
                    </span>
                    <span role="cell">
                      <span className="md:hidden">Mood </span>
                      {row.before === null || row.after === null
                        ? "—"
                        : `${row.before}% → ${row.after}% (${formatChange(row.after - row.before)})`}
                    </span>
                    <span role="cell">
                      <span className="md:hidden">Belief </span>
                      {row.belief === null ? "—" : `${row.belief}%`}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        <Link href="/record/new" className="btn btn-primary mt-4 md:max-w-xs">
          Start a new record
        </Link>
      </main>

      <TabNav />
    </>
  );
}
