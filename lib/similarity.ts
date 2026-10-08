// Word-overlap similarity. Runs locally, so it works with AI turned off.

const STOP_WORDS = new Set(
  "the and for that this with was were have has had not but you your about from they them their there what when where which who will would could should can just really very into out get got going been being are its it's i'm i've don't didn't than then too also like feel felt think thought because".split(
    " ",
  ),
);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9']+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
  );
}

/** Jaccard overlap of meaningful words, 0–1. */
export function wordSimilarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  left.forEach((word) => {
    if (right.has(word)) shared += 1;
  });
  return shared / (left.size + right.size - shared);
}

/** Below this, two records are treated as unrelated. */
export const WORD_SIMILARITY_THRESHOLD = 0.2;
