"use client";

import { useState } from "react";
import { examine } from "@/lib/moods";
import type { Mood } from "@/types";

interface MoodEditorProps {
  moods: Mood[];
  onChange: (moods: Mood[]) => void;
  /** Hide add/remove when only re-rating existing moods. */
  allowEditList?: boolean;
  /** Common moods offered as one-tap chips. */
  suggestions?: string[];
  /** Let the user mark the one mood they want to examine. */
  selectable?: boolean;
  /** Re-rating: the original moods, to star the examined one and show each earlier rating. */
  baseline?: Mood[];
}

export function MoodEditor({
  moods,
  onChange,
  allowEditList = true,
  suggestions = [],
  selectable = false,
  baseline,
}: MoodEditorProps) {
  const [draft, setDraft] = useState("");

  const has = (emotion: string) =>
    moods.some((m) => m.emotion.toLowerCase() === emotion.toLowerCase());
  const remaining = suggestions.filter((emotion) => !has(emotion));

  function addMood(emotion: string) {
    if (!has(emotion)) onChange([...moods, { emotion, intensity: 50, ai_suggested: false }]);
  }

  function add() {
    const emotion = draft.trim();
    if (!emotion) return;
    addMood(emotion);
    setDraft("");
  }

  const before = (emotion: string) =>
    baseline?.find((m) => m.emotion.toLowerCase() === emotion.toLowerCase());

  function setIntensity(index: number, intensity: number) {
    onChange(moods.map((m, i) => (i === index ? { ...m, intensity } : m)));
  }

  return (
    <div>
      {moods.map((mood, index) => (
        <div
          key={mood.emotion}
          className={`card ${(selectable || baseline) && mood.examine ? "examined" : ""}`}
        >
          <div className="flex items-center gap-2">
            <span className="card-title mb-0 flex-1">
              {baseline && mood.examine && (
                <span className="examined-star" title="The mood you chose to examine">
                  ★{" "}
                </span>
              )}
              {mood.emotion}
            </span>
            {mood.ai_suggested && <span className="ai-tag mb-0">
                <span className="ai-spark">✦</span> AI suggested
              </span>}
            <span className="w-10 text-right text-xs text-text2">{mood.intensity}%</span>
            {allowEditList && !before(mood.emotion) && (
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center text-lg text-text3"
                onClick={() => onChange(moods.filter((_, i) => i !== index))}
                aria-label={`Remove ${mood.emotion}`}
              >
                ×
              </button>
            )}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={mood.intensity}
            onChange={(e) => setIntensity(index, Number(e.target.value))}
            className="mood-slider"
            style={{ "--fill": `${mood.intensity}%` } as React.CSSProperties}
            aria-label={`${mood.emotion} intensity`}
          />
          {baseline && (
            <p className="text-xs text-text3">
              {before(mood.emotion)
                ? `Before: ${before(mood.emotion)?.intensity}%`
                : "New mood"}
              {mood.examine ? " · the mood you chose to examine" : ""}
            </p>
          )}
          {selectable && (
            <button
              type="button"
              role="radio"
              aria-checked={mood.examine === true}
              className={`examine-btn ${mood.examine ? "on" : ""}`}
              onClick={() => onChange(examine(moods, mood.emotion))}
            >
              <svg className="examine-star" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1-4.5-4.3 6.1-.8L12 3.2z" />
              </svg>
              {mood.examine ? "Examining this mood" : "Examine this mood"}
            </button>
          )}
        </div>
      ))}

      {allowEditList && (
        <div className="flex gap-2">
          <input
            className="field"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={baseline ? "Add a new mood you notice…" : "Add an emotion…"}
            aria-label="Emotion"
          />
          <button
            type="button"
            className="btn btn-ghost mt-0 w-auto shrink-0 px-4"
            onClick={add}
            disabled={!draft.trim()}
          >
            Add
          </button>
        </div>
      )}

      {allowEditList && remaining.length > 0 && (
        <div className="mt-4">
          <p className="section-label">Common moods — tap to add</p>
          <div className="mood-row">
            {remaining.map((emotion) => (
              <button key={emotion} type="button" className="chip" onClick={() => addMood(emotion)}>
                + {emotion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
