// Runs the app's own crisis check (transpiled from lib/crisis.ts) on phrases
// that must be caught and ordinary phrases that must not be.
const fs = require("fs");
const ts = require("typescript");
const js = ts.transpileModule(fs.readFileSync("lib/crisis.ts", "utf8"), { compilerOptions: { module: "commonjs", target: "es2019" } }).outputText;
const m = { exports: {} };
new Function("require", "module", "exports", js)(require, m, m.exports);
const { detectCrisis } = m.exports;

const mustCatch = [
  "I don't see purpose to live.",
  "I dont see any reason to live",
  "I see no point in living",
  "there's no reason to go on",
  "I have no will to live",
  "I've lost the will to live",
  "what's the point of living",
  "I don't want to live anymore",
  "I don't want to be alive",
  "I can't bear to go on",
  "I want to die",
  "I wish I was dead",
  "I wish I had never been born",
  "I'm thinking about suicide",
  "feeling suicidal",
  "I want to kill myself",
  "I keep hurting myself",
  "thinking of ending my life",
  "I want to end it all",
  "everyone would be better off without me",
  "life is not worth living",
  "life isn't worth it",
  "life is pointless",
  "I'm tired of living",
  "I won't be here much longer, not be here anymore",
  "I don't want to be here",
  "What's the point of any of it.",
  "Nothing is ever going to get better.",
  "it's never going to get better",
  "I can't go on",
  "I can't do this anymore",
  "I've given up on life",
  "self-harm", "self harm", "I cut myself last night",
];

const mustNotCatch = [
  "Got critical feedback from my manager in a team meeting in front of everyone",
  "I failed even after studying. Others seemed to do better.",
  "I'm not smart enough for this program. I'm going to fail out.",
  "My career is going nowhere.",
  "I'll never get out of debt.",
  "It's my fault he died.",
  "My dog died last week.",
  "I'm unlovable.",
  "I don't see the point of this meeting",
  "there's no reason to worry",
  "I don't want to go to the party",
  "I don't want to live in this city anymore",
  "I can't go on holiday this year",
  "the deadline is killing me",
  "I cut my finger while cooking",
  "She thinks I'm careless. I am going to lose her trust.",
  "I want to live closer to my family",
  "My life is busy right now",
  "I gave up on the project",
  "this headache means something dangerous is wrong with me",
  "I don't want to be here at this conference",
  "I could have died of embarrassment",
  "bad day",
];

let failed = 0;
for (const t of mustCatch) if (!detectCrisis(t)) { failed++; console.log("MISSED:       ", t); }
for (const t of mustNotCatch) if (detectCrisis(t)) { failed++; console.log("FALSE ALARM:  ", t); }
console.log(`\ncaught ${mustCatch.filter(detectCrisis).length}/${mustCatch.length} crisis phrases; ` +
  `${mustNotCatch.filter(detectCrisis).length}/${mustNotCatch.length} false alarms on ordinary phrases`);

// The eval's own cases: only the one marked expect_blocked should match.
const cases = JSON.parse(fs.readFileSync("evals/balanced-thought/cases.json", "utf8"));
const hit = cases.filter(c => detectCrisis([c.situation, c.automaticThoughts, c.hotThought, c.evidenceFor, c.evidenceAgainst].join("\n"))).map(c => c.id);
console.log("eval cases matched:", JSON.stringify(hit));
process.exit(failed ? 1 : 0);
