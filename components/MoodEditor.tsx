"use client";

import { useState } from "react";
import type { Mood } from "@/types";

interface MoodEditorProps {
  moods: Mood[];
  onChange: (moods: Mood[]) => void;
  /** Hide add/remove when only re-rating existing moods. */
  allowEditList?: boolean;
  /** Common moods offered as one-tap chips. */
  suggestions?: string[];
}

export function MoodEditor({
  moods,
  onChange,
  allowEditList = true,
  suggestions = [],
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

  function setIntensity(index: number, intensity: number) {
    onChange(moods.map((m, i) => (i === index ? { ...m, intensity } : m)));
  }

  return (
    <div>
      {moods.map((mood, index) => (
        <div key={mood.emotion} className="card">
          <div className="flex items-center gap-2">
            <span className="card-title mb-0 flex-1">{mood.emotion}</span>
            {mood.ai_suggested && <span className="ai-tag mb-0">✦ AI suggested</span>}
            <span className="w-10 text-right text-xs text-text2">{mood.intensity}%</span>
            {allowEditList && (
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
            aria-label={`${mood.emotion} intensity`}
          />
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
            placeholder="Add an emotion…"
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
