"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CrisisBanner } from "@/components/CrisisBanner";
import { MoodEditor } from "@/components/MoodEditor";
import { postJson } from "@/lib/api";
import { CRISIS_RESOURCES, detectCrisis } from "@/lib/crisis";
import { formatDate } from "@/lib/format";
import { COMMON_MOODS } from "@/lib/moods";
import { createClient } from "@/lib/supabase/client";
import type {
  DetectSimilarityRequest,
  DetectSimilarityResponse,
  EvidenceColumn,
  GenerateBalancedRequest,
  GenerateBalancedResponse,
  Mood,
  SimilarRecord,
  SuggestEvidenceRequest,
  SuggestEvidenceResponse,
  SuggestMoodsRequest,
  SuggestMoodsResponse,
  ThoughtRecord,
  ThoughtRecordUpdate,
} from "@/types";

const STEPS = [
  {
    label: "Situation",
    hint: "What happened? Where were you, who were you with, and when?",
  },
  {
    label: "Moods",
    hint: "Name each emotion you felt and rate how intense it was, from 0 to 100%.",
  },
  {
    label: "Automatic thoughts",
    hint: "What went through your mind? Write freely, then pick the thought that feels most distressing — your hot thought.",
  },
  {
    label: "Evidence for the hot thought",
    hint: "What facts support this thought? Stick to what actually happened, not interpretations.",
  },
  {
    label: "Evidence against the hot thought",
    hint: "What facts don't fit this thought? What would you say to a friend in the same situation?",
  },
  {
    label: "Balanced thought",
    hint: "A realistic perspective weighing both sides of the evidence. This thought belongs to you.",
  },
  {
    label: "Outcome",
    hint: "Re-rate your moods now that you've worked through the record.",
  },
] as const;

const TOTAL = STEPS.length;
const AI_UNAVAILABLE = "AI suggestions aren't available right now. You can carry on without them.";

const AI_PAUSED =
  "AI suggestions are paused while the support resources above are showing. You can keep writing in your own words.";

type AiTask = "evidence" | "balanced";

function firstOpenStep(record: ThoughtRecord): number {
  if (!record.situation.trim()) return 1;
  if (record.moods.length === 0) return 2;
  if (!record.automatic_thoughts.trim() || !record.hot_thought.trim()) return 3;
  if (!record.evidence_for.trim()) return 4;
  if (!record.evidence_against.trim()) return 5;
  if (!record.balanced_thought.trim()) return 6;
  return 7;
}

interface RecordFlowProps {
  userId: string;
  aiEnabled: boolean;
  /** An in-progress record to resume. */
  initialRecord?: ThoughtRecord;
}

export function RecordFlow({ userId, aiEnabled, initialRecord }: RecordFlowProps) {
  const router = useRouter();
  const startStep = initialRecord ? firstOpenStep(initialRecord) : 1;

  const [step, setStep] = useState(startStep);
  const [maxStep, setMaxStep] = useState(startStep);
  const [recordId, setRecordId] = useState<string | null>(initialRecord?.id ?? null);

  const [situation, setSituation] = useState(initialRecord?.situation ?? "");
  const [moods, setMoods] = useState<Mood[]>(initialRecord?.moods ?? []);
  const [automaticThoughts, setAutomaticThoughts] = useState(
    initialRecord?.automatic_thoughts ?? "",
  );
  const [hotThought, setHotThought] = useState(initialRecord?.hot_thought ?? "");
  const [evidenceFor, setEvidenceFor] = useState(initialRecord?.evidence_for ?? "");
  const [evidenceAgainst, setEvidenceAgainst] = useState(initialRecord?.evidence_against ?? "");
  const [balancedThought, setBalancedThought] = useState(initialRecord?.balanced_thought ?? "");
  const [balancedThoughtAi, setBalancedThoughtAi] = useState<string | null>(
    initialRecord?.balanced_thought_ai ?? null,
  );
  const [outcomeMoods, setOutcomeMoods] = useState<Mood[]>(initialRecord?.outcome_moods ?? []);
  const [similarId, setSimilarId] = useState<string | null>(
    initialRecord?.similar_record_id ?? null,
  );
  const [similar, setSimilar] = useState<SimilarRecord | null>(null);

  const [moodSuggestions, setMoodSuggestions] = useState<Mood[]>([]);
  const [moodAi, setMoodAi] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [questions, setQuestions] = useState<Partial<Record<EvidenceColumn, string[]>>>({});
  const [aiBusy, setAiBusy] = useState<AiTask | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const crisisNow = useMemo(
    () =>
      detectCrisis(
        [situation, automaticThoughts, hotThought, evidenceFor, evidenceAgainst, balancedThought].join(
          "\n",
        ),
      ),
    [situation, automaticThoughts, hotThought, evidenceFor, evidenceAgainst, balancedThought],
  );
  // Once flagged, the record stays flagged even if the text is edited away.
  const [crisisSeen, setCrisisSeen] = useState(initialRecord?.crisis_flagged ?? false);
  if (crisisNow && !crisisSeen) setCrisisSeen(true);

  const current = STEPS[step - 1];

  const canProceed =
    (step === 1 && situation.trim().length > 0) ||
    (step === 2 && moods.length > 0) ||
    (step === 3 && automaticThoughts.trim().length > 0 && hotThought.trim().length > 0) ||
    step >= 4;

  async function persist(isComplete: boolean): Promise<string | null> {
    setSaving(true);
    setSaveError(null);

    const payload: ThoughtRecordUpdate = {
      situation,
      moods,
      automatic_thoughts: automaticThoughts,
      hot_thought: hotThought,
      evidence_for: evidenceFor,
      evidence_against: evidenceAgainst,
      balanced_thought: balancedThought,
      balanced_thought_ai: balancedThoughtAi,
      outcome_moods: outcomeMoods,
      is_complete: isComplete,
      similar_record_id: similarId,
      crisis_flagged: crisisSeen || crisisNow,
      ai_enabled: aiEnabled,
    };

    const supabase = createClient();
    let id = recordId;
    let failed = false;

    if (id) {
      const { error } = await supabase.from("thought_records").update(payload).eq("id", id);
      if (error) console.error("[record] Save failed:", error.message);
      failed = Boolean(error);
    } else {
      const { data, error } = await supabase
        .from("thought_records")
        .insert({ ...payload, user_id: userId })
        .select("id")
        .single();
      if (error) console.error("[record] Save failed:", error.message);
      failed = Boolean(error) || !data;
      id = data?.id ?? null;
      if (id) setRecordId(id);
    }

    setSaving(false);
    if (failed) {
      setSaveError("Couldn't save your record. Check your connection and try again.");
      return null;
    }
    return id;
  }

  function goTo(target: number) {
    setAiError(null);
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
    window.scrollTo({ top: 0 });
  }

  async function next() {
    if (!(await persist(false))) return;

    // The route only involves AI when the user has it enabled.
    if (step === 3) void checkSimilarity();
    if (step === 6 && outcomeMoods.length === 0) {
      // Start the re-rating from the original moods.
      setOutcomeMoods(moods.map((m) => ({ ...m })));
    }
    goTo(step + 1);
  }

  async function finish() {
    const id = await persist(true);
    if (!id) return;
    router.push(`/record/${id}`);
    router.refresh();
  }

  async function checkSimilarity() {
    const result = await postJson<DetectSimilarityRequest, DetectSimilarityResponse>(
      "/api/detect-similarity",
      { situation, hotThought },
    );
    if (result?.similar) {
      setSimilar(result.similar);
      setSimilarId(result.similar.id);
    }
  }

  async function runAi<T>(task: AiTask, call: () => Promise<T | null>, onResult: (result: T) => void) {
    if (crisisNow) return setAiError(AI_PAUSED);
    setAiBusy(task);
    setAiError(null);
    const result = await call();
    setAiBusy(null);
    if (result) onResult(result);
    else setAiError(AI_UNAVAILABLE);
  }

  async function loadMoodSuggestions() {
    setMoodAi("loading");
    const result = await postJson<SuggestMoodsRequest, SuggestMoodsResponse>(
      "/api/suggest-moods",
      { situation, automaticThought: automaticThoughts },
    );
    if (result) setMoodSuggestions(result.moods);
    setMoodAi(result ? "done" : "failed");
  }

  // With AI on, mood suggestions arrive on their own when column 2 opens
  // (once per situation, so going back and forth doesn't refetch).
  const moodsLoadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 2 || !aiEnabled || crisisNow) return;
    if (moodsLoadedFor.current === situation) return;
    moodsLoadedFor.current = situation;
    void loadMoodSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, aiEnabled, crisisNow, situation]);

  const openMoodSuggestions = moodSuggestions.filter(
    (s) => !moods.some((m) => m.emotion.toLowerCase() === s.emotion.toLowerCase()),
  );

  const suggestEvidence = (column: EvidenceColumn) =>
    runAi(
      "evidence",
      () =>
        postJson<SuggestEvidenceRequest, SuggestEvidenceResponse>("/api/suggest-evidence", {
          situation,
          hotThought,
          column,
        }),
      (result) => setQuestions((q) => ({ ...q, [column]: result.questions })),
    );

  const generateBalanced = () =>
    runAi(
      "balanced",
      () =>
        postJson<GenerateBalancedRequest, GenerateBalancedResponse>("/api/generate-balanced", {
          situation,
          moods,
          automaticThoughts,
          hotThought,
          evidenceFor,
          evidenceAgainst,
        }),
      (result) => setBalancedThoughtAi(result.balancedThought),
    );

  function acceptMood(suggestion: Mood) {
    setMoodSuggestions((list) => list.filter((m) => m.emotion !== suggestion.emotion));
    if (moods.some((m) => m.emotion.toLowerCase() === suggestion.emotion.toLowerCase())) return;
    setMoods([...moods, { ...suggestion, ai_suggested: true }]);
  }

  // The user's own words are never replaced: a suggestion is appended.
  function copySuggestionIntoThought() {
    if (!balancedThoughtAi) return;
    setBalancedThought((own) => (own.trim() ? `${own.trim()}\n\n${balancedThoughtAi}` : balancedThoughtAi));
  }

  const evidenceColumn: EvidenceColumn | null = step === 4 ? 4 : step === 5 ? 5 : null;

  return (
    <>
      <AppHeader
        title={initialRecord ? "Continue thought record" : "New thought record"}
        subtitle={`Column ${step} of ${TOTAL} — ${current.label}`}
        backHref="/dashboard"
      />

      <main className="content">
        <nav className="stepper" aria-label="Columns">
          {STEPS.map((s, index) => {
            const n = index + 1;
            const state = n === step ? "current" : n <= maxStep ? "done" : "";
            return (
              <button
                key={s.label}
                type="button"
                className={`step ${state}`}
                disabled={n > maxStep}
                onClick={() => goTo(n)}
                aria-label={`Column ${n}: ${s.label}`}
                aria-current={n === step ? "step" : undefined}
              >
                {n}
              </button>
            );
          })}
        </nav>

        {(crisisNow || crisisSeen) && <CrisisBanner resources={CRISIS_RESOURCES} />}

        {similar && step >= 4 && (
          <div className="aff-card">
            <p className="aff-label">⚡ Similar situation — your past balanced thought</p>
            <p className="aff-text">“{similar.balanced_thought}”</p>
            <p className="aff-date">From your {formatDate(similar.created_at)} record</p>
          </div>
        )}

        <h2 className="col-label">{current.label}</h2>
        <p className="col-hint">{current.hint}</p>

        {step === 1 && (
          <textarea
            className="field"
            rows={5}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Describe what happened…"
            aria-label="Situation"
          />
        )}

        {step === 2 && (
          <>
            {/* Common moods are the non-AI alternative, so they only show with AI off. */}
            <MoodEditor
              moods={moods}
              onChange={setMoods}
              suggestions={aiEnabled ? [] : COMMON_MOODS}
            />

            {aiEnabled && crisisNow && <p className="col-hint mt-3">{AI_PAUSED}</p>}

            {aiEnabled && !crisisNow && moodAi === "loading" && (
              <div className="ai-suggestion" role="status">
                <p className="ai-tag mb-0">✦ AI is suggesting moods…</p>
              </div>
            )}

            {aiEnabled && !crisisNow && moodAi === "failed" && (
              <button type="button" className="ai-btn" onClick={loadMoodSuggestions}>
                <span className="ai-dot">↺</span>
                AI couldn&apos;t suggest moods just now — tap to try again
              </button>
            )}

            {aiEnabled && openMoodSuggestions.length > 0 && (
              <div className="ai-suggestion">
                <p className="ai-tag">✦ AI-generated — tap to add, then adjust</p>
                <div className="mood-row">
                  {openMoodSuggestions.map((mood) => (
                    <button
                      key={mood.emotion}
                      type="button"
                      className="ai-chip"
                      onClick={() => acceptMood(mood)}
                    >
                      + {mood.emotion} {mood.intensity}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <textarea
              className="field"
              rows={5}
              value={automaticThoughts}
              onChange={(e) => setAutomaticThoughts(e.target.value)}
              placeholder="Write what went through your mind…"
              aria-label="Automatic thoughts"
            />
            <label className="field-label mt-3" htmlFor="hot-thought">
              Hot thought — the most distressing one
            </label>
            <textarea
              id="hot-thought"
              className="field"
              rows={2}
              value={hotThought}
              onChange={(e) => setHotThought(e.target.value)}
              placeholder="The thought that carries the most weight…"
            />
          </>
        )}

        {evidenceColumn && (
          <>
            <textarea
              className="field"
              rows={5}
              value={evidenceColumn === 4 ? evidenceFor : evidenceAgainst}
              onChange={(e) =>
                evidenceColumn === 4
                  ? setEvidenceFor(e.target.value)
                  : setEvidenceAgainst(e.target.value)
              }
              placeholder="List the facts…"
              aria-label={current.label}
            />

            {aiEnabled && (
              <button
                type="button"
                className="ai-btn"
                onClick={() => suggestEvidence(evidenceColumn)}
                disabled={aiBusy !== null}
              >
                <span className="ai-dot">✦</span>
                {aiBusy === "evidence" ? "Thinking…" : "Suggest questions to help me think"}
              </button>
            )}

            {(questions[evidenceColumn]?.length ?? 0) > 0 && (
              <div className="ai-suggestion">
                <p className="ai-tag">✦ AI-generated questions — answer in your own words</p>
                <ul className="list-disc space-y-1.5 pl-4">
                  {questions[evidenceColumn]?.map((question) => (
                    <li key={question} className="ai-suggestion-text">
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {step === 6 && (
          <>
            {balancedThoughtAi && (
              <div className="ai-suggestion">
                <p className="ai-tag">✦ AI-generated suggestion — based on your entries</p>
                <p className="ai-suggestion-text">{balancedThoughtAi}</p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={copySuggestionIntoThought}
                >
                  Copy into my thought to edit
                </button>
              </div>
            )}

            <textarea
              className="field"
              rows={5}
              value={balancedThought}
              onChange={(e) => setBalancedThought(e.target.value)}
              placeholder="Write your balanced thought…"
              aria-label="Balanced thought"
            />

            {aiEnabled && (
              <button
                type="button"
                className="ai-btn"
                onClick={generateBalanced}
                disabled={aiBusy !== null}
              >
                <span className="ai-dot">{balancedThoughtAi ? "↺" : "✦"}</span>
                {aiBusy === "balanced"
                  ? "Thinking…"
                  : balancedThoughtAi
                    ? "Regenerate a different suggestion"
                    : "Suggest a balanced thought with AI"}
              </button>
            )}
          </>
        )}

        {step === 7 && <MoodEditor moods={outcomeMoods} onChange={setOutcomeMoods} />}

        {aiError && (
          <p className="form-error" role="status">
            {aiError}
          </p>
        )}

        {step >= 2 && (
          <section className="mt-5">
            <h3 className="section-label">Completed columns</h3>
            <div className="past-col">
              <p className="past-col-label">Column 1 — Situation</p>
              <p className="past-col-text">{situation}</p>
            </div>
            {step >= 3 && (
              <div className="past-col">
                <p className="past-col-label">Column 2 — Moods</p>
                <div className="mood-row mt-1">
                  {moods.map((mood) => (
                    <span key={mood.emotion} className="mood">
                      {mood.emotion} {mood.intensity}%
                    </span>
                  ))}
                </div>
              </div>
            )}
            {step >= 4 && (
              <div className="past-col">
                <p className="past-col-label">Column 3 — Hot thought</p>
                <p className="past-col-text">{hotThought}</p>
              </div>
            )}
          </section>
        )}

        {saveError && (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        )}

        {step < TOTAL ? (
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={next}
            disabled={!canProceed || saving}
          >
            {saving ? "Saving…" : `Next — ${STEPS[step].label.toLowerCase()}`}
          </button>
        ) : (
          <button type="button" className="btn btn-primary mt-4" onClick={finish} disabled={saving}>
            {saving ? "Saving…" : "Save and complete record"}
          </button>
        )}

        {step > 1 && (
          <button type="button" className="btn btn-ghost" onClick={() => goTo(step - 1)}>
            Back
          </button>
        )}
      </main>
    </>
  );
}
