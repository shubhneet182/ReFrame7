import type { CrisisCheckResponse, CrisisResource } from "@/types";

// First line of defence: phrase patterns, checked in the browser as the person
// types, so the banner works instantly and offline. Deliberately broad: it is
// better to show support resources when they weren't needed than to miss
// someone. It cannot catch every wording, so the AI routes also flag entries
// that suggest the person may not want to live (see BASE in lib/prompts.ts).
//
// Text is lower-cased and apostrophes are removed before matching, so the
// patterns are written without them ("dont", "cant", "whats").

const LIVE = "(?:live|living|life|be alive|being alive|exist|existing|be here|being here|go on|going on|keep going|carry on|carrying on|wake up|waking up)";

// "I don't want to live in this city" is about a place, not about living.
const NOT_A_PLACE = "(?!\\s+(?:in|at|near|on|there|closer|next|by|for|today|tonight|when|while)\\b)";

const CRISIS_PATTERNS: RegExp[] = [
  // Suicide and self-harm, named directly.
  /\bsuicid/,
  /\b(?:kill|killing|hurt|hurting|harm|harming|cut|cutting)\s+my\s?self\b/,
  /\bself[\s-]?harm/,
  /\b(?:end|ending|take|taking)\s+(?:my|my own)\s+life\b/,
  /\bend(?:ing)?\s+it\s+all\b/,
  /\b(?:want|wanna|wish|wanting|going|ready)\s+to\s+(?:die|be dead|disappear|not exist|not wake up|end it|end things)\b/,
  /\bwish\s+(?:i|that i)\s+(?:was|were|wasnt|werent|had never been)\s+(?:dead|born|alive|here)\b/,
  /\bbetter\s+off\s+(?:dead|without me)\b/,

  // Not wanting to live, or seeing no reason to.
  new RegExp(`\\b(?:dont|do not|doesnt|didnt|no longer|never|cant|cannot)\\s+(?:want|wanna|wish|bear|stand)\\s+to\\s+${LIVE}\\b${NOT_A_PLACE}`),
  new RegExp(`\\b(?:no|not any|dont see(?: a| any| the| much)?|cant see(?: a| any| the)?|dont have(?: a| any)?|without(?: a| any)?|lost(?: my| all| any| the)?|whats the|what is the|wheres the|see no|have no|theres no|there is no)\\s+(?:purpose|reason|point|will|meaning|need)\\s+(?:to|in|of|for)\\s+${LIVE}\\b`),
  /\bnot\s+worth\s+(?:living|it anymore|going on)\b/,
  /\b(?:life|living)\s+(?:is|isnt|feels|seems|has become)\s+(?:not worth|pointless|meaningless|worthless|hopeless|too much|unbearable)\b/,
  /\b(?:life|living)\s+(?:isnt|is not)\s+worth\b/,
  /\btired\s+of\s+(?:living|life|being alive|existing)\b/,
  /\bnot\s+be\s+here\s+(?:anymore|any more|much longer)\b/,
  /\bdont\s+want\s+to\s+be\s+here\b(?!\s+(?:at|in|for|with|today|tonight|right now|when|while)\b)/,

  // Strong, general hopelessness.
  /\bwhats?\s+(?:is\s+)?the\s+point\s+of\s+(?:anything|any of it|any of this|it all|everything|trying|going on|living|life)\b/,
  /\bno\s+point\s+(?:to|in)\s+(?:anything|any of it|everything|trying anymore)\b/,
  /\bnothing\s+(?:will|is|would)\s+(?:ever\s+)?(?:going\s+to\s+)?(?:get|be|feel)\s+(?:any\s+)?better\b/,
  /\bnever\s+going\s+to\s+get\s+(?:any\s+)?better\b/,
  /\bcant\s+(?:go on|keep going|carry on|do this any ?more|take (?:it|this) any ?more)\b(?!\s+(?:holiday|vacation|a|the|my|our|to|with|stage|about)\b)/,
  /\bcannot\s+(?:go on|keep going|carry on)\b/,
  /\bgiv(?:e|en|ing)\s+up\s+on\s+(?:everything|life|living)\b/,
];

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "9-8-8 Suicide Crisis Helpline",
    contact: "Call or text 9-8-8",
    description: "Free, 24/7, anywhere in Canada.",
  },
  {
    name: "Kids Help Phone",
    contact: "Call 1-800-668-6868 or text CONNECT to 686868",
    description: "Free, 24/7 support for young people in Canada.",
  },
  {
    name: "Emergency services",
    contact: "Call 9-1-1",
    description: "If you or someone else is in immediate danger.",
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['‘’`]/g, "")
    .replace(/\s+/g, " ");
}

export function detectCrisis(text: string): boolean {
  const normalized = normalize(text);
  return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function checkCrisis(text: string): CrisisCheckResponse {
  const isCrisis = detectCrisis(text);
  return { isCrisis, resources: isCrisis ? CRISIS_RESOURCES : [] };
}
