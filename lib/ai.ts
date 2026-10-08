// Server-only: reads provider API keys. Import from API routes, never from client components.
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = "claude" | "gemini";

export interface AIRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** Prefer a quicker model: for short tasks like mood labels. Gemini only. */
  fast?: boolean;
}

export interface AIResult {
  text: string;
  provider: AIProvider;
}

export class AIUnavailableError extends Error {
  constructor(public readonly causes: unknown[]) {
    super("No AI provider could complete the request.");
    this.name = "AIUnavailableError";
  }
}

const CLAUDE_MODEL = "claude-opus-5-5";
// Tried in order. The fast list is for short, simple tasks the user waits on.
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash"];
const GEMINI_FAST_MODELS = ["gemini-flash-lite-latest", "gemini-3.5-flash"];
const DEFAULT_MAX_TOKENS = 4096;

async function callClaude({ system, prompt, maxTokens }: AIRequest): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
    // Suggestions are short and latency-sensitive on mobile.
    output_config: { effort: "low" },
    system,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined the request");
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  if (!text) throw new Error("Claude returned no text");
  return text;
}

async function callGemini({ system, prompt, maxTokens, fast }: AIRequest): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");

  const client = new GoogleGenerativeAI(apiKey);

  // Individual Gemini models return occasional 503 "high demand" errors,
  // so a failure moves on to the next model instead of giving up.
  let lastError: unknown;
  for (const name of fast ? GEMINI_FAST_MODELS : GEMINI_MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: name,
        systemInstruction: system,
        generationConfig: { maxOutputTokens: maxTokens ?? DEFAULT_MAX_TOKENS },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (!text) throw new Error("Gemini returned no text");
      return text;
    } catch (error) {
      lastError = error;
      console.warn(`[ai] ${name} failed:`, error instanceof Error ? error.message : error);
    }
  }
  throw lastError;
}

/** Runs generateText and parses the JSON object in the reply (tolerates code fences). */
export async function generateJson(
  request: AIRequest,
): Promise<{ data: unknown; provider: AIProvider }> {
  const { text, provider } = await generateText(request);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI reply did not contain a JSON object");
  return { data: JSON.parse(text.slice(start, end + 1)) as unknown, provider };
}

/**
 * Tries Claude first; on any failure falls back to Gemini.
 * With no ANTHROPIC_API_KEY set, Claude is skipped and Gemini handles everything.
 */
export async function generateText(request: AIRequest): Promise<AIResult> {
  const causes: unknown[] = [];

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return { text: await callClaude(request), provider: "claude" };
    } catch (error) {
      causes.push(error);
      console.warn("[ai] Claude failed, falling back to Gemini:", error);
    }
  }

  try {
    return { text: await callGemini(request), provider: "gemini" };
  } catch (error) {
    causes.push(error);
    console.error("[ai] Gemini fallback failed:", error);
  }

  throw new AIUnavailableError(causes);
}
