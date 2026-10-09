export interface Mood {
  emotion: string;
  /** 0–100 */
  intensity: number;
  ai_suggested: boolean;
  /** The one mood the user chose to examine in this record (column 2). */
  examine?: boolean;
}

/** Row shape of the `thought_records` table. */
export interface ThoughtRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  situation: string;
  moods: Mood[];
  automatic_thoughts: string;
  hot_thought: string;
  evidence_for: string;
  evidence_against: string;
  balanced_thought: string;
  /** The AI suggestion as generated, kept separately from the user's own wording. */
  balanced_thought_ai: string | null;
  /** How much the user believes their balanced thought, 0–100. */
  balanced_belief: number | null;
  outcome_moods: Mood[];
  is_complete: boolean;
  similar_record_id: string | null;
  crisis_flagged: boolean;
  ai_enabled: boolean;
}

export type ThoughtRecordInsert = Omit<
  ThoughtRecord,
  "id" | "created_at" | "updated_at"
>;
export type ThoughtRecordUpdate = Partial<Omit<ThoughtRecordInsert, "user_id">>;

/** Stored in Supabase auth `user_metadata`. */
export interface UserPreferences {
  /** Set when the user accepts the data-handling notice. */
  privacy_accepted?: boolean;
  ai_enabled?: boolean;
  tour_seen?: boolean;
}

export interface CrisisResource {
  name: string;
  contact: string;
  description: string;
}

/* ---------- API contracts ---------- */

export interface ApiError {
  error: string;
}

export interface SuggestMoodsRequest {
  situation: string;
  automaticThought: string;
}
export interface SuggestMoodsResponse {
  moods: Mood[];
}

export type EvidenceColumn = 4 | 5;

export interface SuggestEvidenceRequest {
  situation: string;
  hotThought: string;
  column: EvidenceColumn;
}
export interface SuggestEvidenceResponse {
  questions: string[];
}

export interface GenerateBalancedRequest {
  situation: string;
  moods: Mood[];
  automaticThoughts: string;
  hotThought: string;
  evidenceFor: string;
  evidenceAgainst: string;
  /** Drafts already shown, when the user asks for a different one. */
  previous?: string[];
  /** How many drafts have been requested before this one (0 for the first). */
  attempt?: number;
}
export interface GenerateBalancedResponse {
  balancedThought: string;
}

export type SimilarRecord = Pick<
  ThoughtRecord,
  "id" | "created_at" | "situation" | "balanced_thought"
>;

export type SimilarityCandidate = Pick<
  ThoughtRecord,
  "id" | "created_at" | "situation" | "hot_thought" | "balanced_thought"
>;

export interface DetectSimilarityRequest {
  situation: string;
  hotThought: string;
  /** Guests only: their session records, since the server has none to query. */
  candidates?: SimilarityCandidate[];
}
export interface DetectSimilarityResponse {
  similar: SimilarRecord | null;
}

export interface ThinkingPattern {
  name: string;
  /** How many of the analysed records show it. */
  count: number;
  explanation: string;
}

export interface AnalyzePatternsRequest {
  thoughts: { hotThought: string; automaticThoughts: string }[];
}
export interface AnalyzePatternsResponse {
  patterns: ThinkingPattern[];
}

export interface CrisisCheckRequest {
  text: string;
}
export interface CrisisCheckResponse {
  isCrisis: boolean;
  resources: CrisisResource[];
}
