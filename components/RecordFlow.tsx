"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CloudMascot } from "@/components/CloudMascot";
import { CrisisBanner } from "@/components/CrisisBanner";
import { MoodChip } from "@/components/MoodChip";
import { MoodEditor } from "@/components/MoodEditor";
import { tourIndexFor, WelcomeTour } from "@/components/WelcomeTour";
import { postJson } from "@/lib/api";
import { CRISIS_RESOURCES, detectCrisis } from "@/lib/crisis";
import { formatDate } from "@/lib/format";
import {
  getGuestRecord,
  GUEST_USER_ID,
  loadGuestRecords,
  saveGuestRecord,
} from "@/lib/guest-records";
import { COMMON_MOODS, ensureExamined, examinedMood, outcomeFrom } from "@/lib/moods";
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
    hint: "Name each emotion you felt and rate how intense it was, from 0 to 100%. Then choose the one mood you want to examine in this record.",
  },
  {
    label: "Automatic thoughts",
    hint: "What went through your mind? Write freely, then pick the thought that feels most distressing as your hot thought.",
  },
  {
    label: "Evidence for the hot thought",
    hint: "What facts support this thought? Stick to what actually happened, not interpretations.",
  },
  {
    label: "Evidence against the hot thought",
    hint: "What facts suggest this thought might not be true? What would you say to a friend in the same situation?",
  },
  {
    label: "Balanced thought",
    hint: "A realistic perspective weighing both sides of the evidence. This thought belongs to you.",
  },
  {
    label: "Outcome",
    hint: "Rate each mood again now that you've worked through the record. The mood you chose to examine is starred. You can also add any new moods you notice.",
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
  /** Null for a guest, whose record is kept in the browser session. */
  userId: string | null;
  aiEnabled?: boolean;
  /** An in-progress record to continue, or a completed one to edit. */
  initialRecord?: ThoughtRecord;
}

export function RecordFlow({ userId, aiEnabled = true, initialRecord }: RecordFlowProps) {
  const router = useRouter();
  // Editing a completed record: start at the top with every column reachable.
  const editing = initialRecord?.is_complete === true;
  const startStep = initialRecord && !editing ? firstOpenStep(initialRecord) : 1;

  const [step, setStep] = useState(startStep);
  const [maxStep, setMaxStep] = useState(editing ? TOTAL : startStep);
  const [celebrating, setCelebrating] = useState(false);

  // The welcome tour steps through this page to explain each column. While it
  // runs, the flow just shows whichever step the tour is describing.
  const [tourStart, setTourStart] = useState<number | null>(null);
  useEffect(() => {
    if (!initialRecord) setTourStart(tourIndexFor("/record/new"));
  }, [initialRecord]);
  const tourActive = tourStart !== null;

  function showTourStep(target: number | null) {
    setStep(target ?? 1);
    if (target === null) setTourStart(null);
  }
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
  // AI drafts shown so far in this sitting (including one saved with the record).
  const [balancedDrafts, setBalancedDrafts] = useState<string[]>(
    initialRecord?.balanced_thought_ai ? [initialRecord.balanced_thought_ai] : [],
  );
  // How many drafts have been asked for; drives the variety of angle and length.
  const [balancedAttempts, setBalancedAttempts] = useState(
    initialRecord?.balanced_thought_ai ? 1 : 0,
  );
  const [belief, setBelief] = useState<number | null>(initialRecord?.balanced_belief ?? null);
  // Synced with column 2 from the start, in case the record is resumed at step 7.
  const [outcomeMoods, setOutcomeMoods] = useState<Mood[]>(() =>
    outcomeFrom(initialRecord?.moods ?? [], initialRecord?.outcome_moods ?? []),
  );
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

  const allText = [
    situation,
    automaticThoughts,
    hotThought,
    evidenceFor,
    evidenceAgainst,
    balancedThought,
  ].join("\n");
  // The AI can also flag an entry the phrase check missed. That holds for the
  // text as it was when flagged, so editing the entry lets AI be asked again.
  const [aiFlaggedText, setAiFlaggedText] = useState<string | null>(null);
  const crisisNow = useMemo(
    () => detectCrisis(allText) || aiFlaggedText === allText,
    [allText, aiFlaggedText],
  );
  const crisisHit = useRef(false);
  const onCrisis = () => {
    crisisHit.current = true;
    setAiFlaggedText(allText);
    setCrisisSeen(true);
  };
  // Once flagged, the record stays flagged even if the text is edited away.
  const [crisisSeen, setCrisisSeen] = useState(initialRecord?.crisis_flagged ?? false);
  if (crisisNow && !crisisSeen) setCrisisSeen(true);

  const current = STEPS[step - 1];

  const canProceed =
    (step === 1 && situation.trim().length > 0) ||
    (step === 2 && examinedMood(moods) !== undefined) ||
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
      balanced_belief: balancedThought.trim() ? belief : null,
      outcome_moods: outcomeMoods,
      // A completed record stays completed while it is being edited.
      is_complete: isComplete || editing,
      similar_record_id: similarId,
      crisis_flagged: crisisSeen || crisisNow,
      ai_enabled: aiEnabled,
    };

    if (userId === null) {
      const now = new Date().toISOString();
      const id = recordId ?? crypto.randomUUID();
      const saved = saveGuestRecord({
        ...payload,
        id,
        user_id: GUEST_USER_ID,
        created_at: getGuestRecord(id)?.created_at ?? now,
        updated_at: now,
      } as ThoughtRecord);
      setSaving(false);
      if (!saved) {
        setSaveError("Couldn't save your record in this browser. Check that storage isn't blocked.");
        return null;
      }
      setRecordId(id);
      return id;
    }

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
    // Re-rating starts from the moods in column 2, kept in step if they changed.
    if (target === 7) setOutcomeMoods(outcomeFrom(moods, outcomeMoods));
    setAiError(null);
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
    window.scrollTo({ top: 0 });
  }

  async function next() {
    if (!(await persist(false))) return;

    // The route only involves AI when the user has it enabled.
    if (step === 3) void checkSimilarity();
    goTo(step + 1);
  }

  async function finish() {
    const id = await persist(true);
    if (!id) return;
    if (editing) {
      router.push(`/record/${id}`);
      router.refresh();
    } else {
      setCelebrating(true);
    }
  }

  function closeCelebration() {
    router.push("/dashboard");
    router.refresh();
  }

  async function checkSimilarity() {
    const request: DetectSimilarityRequest = { situation, hotThought };
    if (userId === null) {
      // The server has no copy of a guest's records, so send this session's.
      request.candidates = loadGuestRecords()
        .filter((r) => r.is_complete && r.id !== recordId && r.balanced_thought.trim())
        .map(({ id, created_at, situation: s, hot_thought, balanced_thought }) => ({
          id,
          created_at,
          situation: s,
          hot_thought,
          balanced_thought,
        }));
      if (request.candidates.length === 0) return;
    }
    const result = await postJson<DetectSimilarityRequest, DetectSimilarityResponse>(
      "/api/detect-similarity",
      request,
      { onCrisis },
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
    crisisHit.current = false;
    const result = await call();
    setAiBusy(null);
    if (result) onResult(result);
    // A crisis stop shows the banner and the "paused" note instead of an error.
    else setAiError(crisisHit.current ? AI_PAUSED : AI_UNAVAILABLE);
  }

  async function loadMoodSuggestions() {
    setMoodAi("loading");
    const result = await postJson<SuggestMoodsRequest, SuggestMoodsResponse>(
      "/api/suggest-moods",
      { situation, automaticThought: automaticThoughts },
      { onCrisis },
    );
    if (result) setMoodSuggestions(result.moods);
    setMoodAi(result ? "done" : "failed");
  }

  // With AI on, mood suggestions arrive on their own when column 2 opens
  // (once per situation, so going back and forth doesn't refetch).
  const moodsLoadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 2 || !aiEnabled || crisisNow || tourActive) return;
    if (moodsLoadedFor.current === situation) return;
    moodsLoadedFor.current = situation;
    void loadMoodSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, aiEnabled, crisisNow, situation, tourActive]);

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
        }, { onCrisis }),
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
          // On "regenerate", say what has already been offered so the next
          // draft takes a different angle instead of rewording the last one.
          previous: balancedDrafts,
          attempt: balancedAttempts,
        }, { onCrisis }),
      (result) => {
        setBalancedAttempts((count) => count + 1);
        setBalancedThoughtAi(result.balancedThought);
        setBalancedDrafts((drafts) => [...drafts, result.balancedThought].slice(-3));
      },
    );

  function acceptMood(suggestion: Mood) {
    // The suggestion stays in the list (hidden while the mood is in use), so
    // removing the mood later offers it again.
    if (moods.some((m) => m.emotion.toLowerCase() === suggestion.emotion.toLowerCase())) return;
    setMoods(ensureExamined([...moods, { ...suggestion, ai_suggested: true }]));
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
        title={editing ? "Edit thought record" : initialRecord ? "Continue thought record" : "New thought record"}
        backHref="/dashboard"
      />

      <main className="content flow">
        <div className="flow-top">
        <nav className="stepper" aria-label="Columns">
          {STEPS.map((s, index) => {
            const n = index + 1;
            const state = n === step ? "current" : n <= maxStep ? "done" : "";
            return (
              <Fragment key={s.label}>
                {/* The track fills in as far as the user has reached. */}
                {n > 1 && <span className={`step-line ${n <= maxStep ? "done" : ""}`} />}
                <button
                  type="button"
                  className={`step ${state}`}
                  disabled={n > maxStep}
                  onClick={() => goTo(n)}
                  aria-label={`Column ${n}: ${s.label}${state === "done" ? " (done)" : ""}`}
                  aria-current={n === step ? "step" : undefined}
                >
                  {state === "done" ? (
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                      <path
                        d="M3.5 8.5l3 3 6-6.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    n
                  )}
                </button>
              </Fragment>
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
        </div>

        <div className="flow-edit" data-tour="flow-edit">
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
              onChange={(next) => setMoods(ensureExamined(next))}
              suggestions={aiEnabled ? [] : COMMON_MOODS}
              selectable
            />

            {moods.length > 1 && !examinedMood(moods) && (
              <p className="form-error" role="status">
                Choose the one mood you want to examine to continue.
              </p>
            )}

            {aiEnabled && crisisNow && <p className="col-hint mt-3">{AI_PAUSED}</p>}

            {aiEnabled && !crisisNow && moodAi === "loading" && (
              <div className="ai-panel" role="status">
                <p className="ai-panel-label mb-0">
                  <span className="ai-spark">✦</span> AI is suggesting moods…
                </p>
              </div>
            )}

            {aiEnabled && !crisisNow && moodAi === "failed" && (
              <button type="button" className="ai-btn" onClick={loadMoodSuggestions}>
                <span className="ai-dot">↺</span>
                AI couldn&apos;t suggest moods just now — tap to try again
              </button>
            )}

            {aiEnabled && openMoodSuggestions.length > 0 && (
              <div className="ai-panel">
                <p className="ai-panel-label">
                  <span className="ai-spark">✦</span> AI-generated — tap to add, then adjust
                </p>
                <div className="flex flex-wrap gap-2">
                  {openMoodSuggestions.map((mood) => (
                    <button
                      key={mood.emotion}
                      type="button"
                      className="ai-pill"
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

            {/* Column 4 is the user's own evidence only; AI questions are offered on column 5. */}
            {aiEnabled && evidenceColumn === 5 && (
              <button
                type="button"
                className="ai-btn"
                onClick={() => suggestEvidence(evidenceColumn)}
                disabled={aiBusy !== null}
              >
                <span className="ai-dot">✦</span>
                {aiBusy === "evidence" ? "Thinking…" : "Get me thinking"}
              </button>
            )}

            {evidenceColumn === 5 && (questions[5]?.length ?? 0) > 0 && (
              <div className="ai-suggestion">
                <p className="ai-tag">
                  <span className="ai-spark">✦</span> Some thought starters from AI
                </p>
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
                <p className="ai-tag">
                  <span className="ai-spark">✦</span> AI-generated suggestion — based on your entries
                </p>
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

            {balancedThought.trim() && (
              <div className="card mt-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="belief" className="card-title mb-0 flex-1">
                    How much do you believe this thought?
                  </label>
                  <span className="text-xs text-text2">
                    {belief === null ? "Not rated" : `${belief}%`}
                  </span>
                </div>
                <input
                  id="belief"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={belief ?? 50}
                  onChange={(e) => setBelief(Number(e.target.value))}
                  className="mood-slider"
                  style={{ "--fill": `${belief ?? 50}%` } as React.CSSProperties}
                />
                <p className="text-[11px] text-text3">
                  0% is not at all, 100% is completely. There is no right answer.
                </p>
              </div>
            )}

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
                    : "Let AI help you find balance"}
              </button>
            )}
          </>
        )}

        {step === 7 && (
          <MoodEditor moods={outcomeMoods} onChange={setOutcomeMoods} baseline={moods} />
        )}

        {aiError && (
          <p className="form-error" role="status">
            {aiError}
          </p>
        )}

        </div>

        {/* Earlier answers: below the editor on phones, a side pane on wide screens. */}
        <aside className="flow-side">
        {step === 1 && (
          <p className="wide-only text-xs leading-relaxed text-text3">
            Your responses appear here as you work through each step.
          </p>
        )}
        {step >= 2 && (
          <section>
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
                    <MoodChip key={mood.emotion} mood={mood} />
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
            {step >= 5 && evidenceFor.trim() && (
              <div className="past-col wide-only">
                <p className="past-col-label">Column 4 — Evidence for</p>
                <p className="past-col-text">{evidenceFor}</p>
              </div>
            )}
            {step >= 6 && evidenceAgainst.trim() && (
              <div className="past-col wide-only">
                <p className="past-col-label">Column 5 — Evidence against</p>
                <p className="past-col-text">{evidenceAgainst}</p>
              </div>
            )}
            {step >= 7 && balancedThought.trim() && (
              <div className="past-col wide-only">
                <p className="past-col-label">Column 6 — Balanced thought</p>
                <p className="past-col-text">{balancedThought}</p>
              </div>
            )}
          </section>
        )}
        </aside>

        <div className="flow-actions">

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
            {saving ? "Saving…" : "Continue"}
          </button>
        ) : (
          <button type="button" className="btn btn-primary mt-4" onClick={finish} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Save and complete record"}
          </button>
        )}

        {editing && step < TOTAL && (
          <button type="button" className="btn btn-ghost" onClick={finish} disabled={saving}>
            Save changes and close
          </button>
        )}

        {step > 1 && (
          <button type="button" className="btn btn-ghost" onClick={() => goTo(step - 1)}>
            Back
          </button>
        )}
        </div>
      </main>

      {tourStart !== null && (
        <WelcomeTour
          route="/record/new"
          startIndex={tourStart}
          signedIn={userId !== null}
          onClose={() => setTourStart(null)}
          onRecordStep={showTourStep}
        />
      )}

      {celebrating && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="done-title">
          <div className="modal">
            <div className="mb-2 flex justify-center">
              <CloudMascot size={72} />
            </div>
            <h2 id="done-title" className="text-xl font-semibold text-blue">
              Good job!
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-text2">
              You worked through all seven columns. That takes real effort.
            </p>

            {balancedThought.trim() && (
              <div className="aff-card affirm mt-4 text-left">
                <p className="aff-label">Repeat after me</p>
                <p className="aff-text">“{balancedThought.trim()}”</p>
              </div>
            )}

            <button type="button" className="btn btn-primary" onClick={closeCelebration} autoFocus>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
