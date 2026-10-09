import type { Mood } from "@/types";

interface MoodChipProps {
  mood: Mood;
  /** Add the AI sparkle after a mood that was suggested by AI. */
  showAi?: boolean;
}

/**
 * A mood and its intensity as a solid pill. The mood chosen to examine is
 * filled in the primary colour; the fill is the cue, so no extra wording.
 */
export function MoodChip({ mood, showAi = false }: MoodChipProps) {
  return (
    <span className={`mood ${mood.examine ? "examined" : ""}`}>
      <strong>{mood.emotion}</strong> {mood.intensity}%
      {showAi && mood.ai_suggested && <span aria-hidden="true"> ✦</span>}
      {mood.examine && <span className="sr-only"> (the mood examined)</span>}
    </span>
  );
}
