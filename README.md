# ReFrame7

ReFrame7 is a web app that guides you through a **thought record**: a short written exercise from
cognitive behavioural therapy (CBT) for stepping back from a distressing thought and looking at it
more clearly. It works on a phone, tablet or computer, and can be installed like an app.

You can use everything without creating an account.

> **ReFrame7 is a self-help tool. It is not a substitute for professional mental health care.**
> If you're going through a difficult time and need support, call or text **9-8-8** anytime in
> Canada. If you're in immediate danger, call **9-1-1**.

---

## What you can do with it

| Tab | What it's for |
|---|---|
| **Home** | See your thought records. Open one to read it, edit it, delete it, or export it as a PDF. You can also export all of them as one PDF table. |
| **Record** | Work through a new thought record, one step at a time. |
| **Affirm** | A collection of the balanced thoughts you've written, in your own words. |
| **Trends** | See how your moods change from the start of a record to the end, and ask AI to point out thinking habits that come up more than once. |

The first time you open the app, a short tour points at each part and explains it. You can replay
it any time with the **?** button on the Home screen.

## The seven steps of a thought record

1. **Situation.** What happened: where you were, who you were with, what you were doing, and when.
2. **Moods.** Name what you felt and rate how strong each feeling was (0–100%). Then choose the one
   mood you want to examine.
3. **Automatic thoughts.** What went through your mind. Pick the most distressing one as your
   "hot thought". The rest of the record works on it.
4. **Evidence for the hot thought.** The facts that support it.
5. **Evidence against the hot thought.** The facts that suggest it might not be true.
6. **Balanced thought.** A fairer way to see the situation, weighing both sides. Then rate how much
   you believe it.
7. **How you feel now.** Rate the same moods again and notice what changed.

Your progress is saved each time you press **Continue**, so you can stop and come back.

## Where AI helps

AI is there to suggest, never to decide. Every suggestion is labelled, and nothing is added to your
own writing unless you choose it.

| Step | What the AI offers |
|---|---|
| 2. Moods | A few moods that might fit, to tap and add. |
| 3 → 4 | Checks whether this situation resembles one you've recorded before, and if so shows your earlier balanced thought as a reminder. |
| 5. Evidence against | A few questions to get you thinking. It asks; you write the evidence. |
| 6. Balanced thought | A draft you can copy and edit. "Regenerate" gives a different angle and length each time. |
| Trends | On request, names common thinking patterns across your records. |

Step 4 has no AI on purpose: the evidence for your thought should be yours alone.

**If an entry suggests someone may be in crisis** (thoughts of self-harm, not wanting to live, or
strong hopelessness), the app shows support resources and pauses AI suggestions for that record.
Two checks do this: a list of phrase patterns that runs as the person types, and the AI itself,
which is told to flag such an entry instead of answering it.

## Your data

- **Without an account:** your records stay in the browser tab you're using and are cleared when
  you close it.
- **With a free account:** your records are saved to your account. Only you can see them, and
  they're there whenever you come back, on any device.
- **AI:** the text of your record is sent to an AI provider to generate suggestions. Your name and
  email are never sent to it.

If you make records without an account and then sign in, the app offers to save them to your
account.

---

## For developers

### What it's built with

| Part | Technology |
|---|---|
| App | [Next.js 14](https://nextjs.org) (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, with the colours defined as CSS variables in `app/globals.css` |
| Accounts and database | [Supabase](https://supabase.com) (email sign-in, Postgres) |
| AI | Claude (Anthropic) first, with Google Gemini as the fallback. See `lib/ai.ts` |
| PDF export | jsPDF, generated in the browser |
| Installable app (PWA) | next-pwa |

### Run it on your computer

You need [Node.js](https://nodejs.org) 18 or newer, a free Supabase project, and at least one AI
key (Anthropic or Google AI Studio).

**1. Install the dependencies**

```bash
npm install
```

**2. Add your keys.** Copy `.env.local.example` to `.env.local` and fill it in:

| Variable | Where to find it | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API. It's `https://<project-id>.supabase.co` | Everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page: the *publishable* key | Everything |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page: the *secret* key | Not used yet |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Claude. Leave blank to use Gemini only |
| `GOOGLE_AI_API_KEY` | aistudio.google.com → Get API key | Gemini |
| `CLAUDE_DAILY_LIMIT` | You choose. Optional, default 150 | How many requests a day go to Claude before the app switches to Gemini |

Never share the secret key or the AI keys, and never commit `.env.local`.

**3. Create the database table.** In Supabase, open the SQL Editor, paste in the contents of
`supabase/schema.sql`, and run it. This creates the `thought_records` table and the rules that keep
each person's records private.

If your table was created before the "belief" rating existed, also run
`supabase/migrations/001_balanced_belief.sql`.

**4. Tell Supabase where the app lives.** Under Authentication → URL Configuration, set the Site
URL to `http://localhost:3000` and add `http://localhost:3000/**` to Redirect URLs. Without this,
the email confirmation and password reset links won't come back to the app.

**5. Start it**

```bash
npm run dev
```

Then open http://localhost:3000.

If `npm` isn't available on your machine, the same thing works with Node directly:

```bash
node node_modules/next/dist/bin/next dev
```

### Other commands

| Command | What it does |
|---|---|
| `npm run build` | Builds the production version |
| `npm run start` | Runs the production build (this is where the installable-app features switch on) |
| `npm run lint` | Checks the code for common problems |
| `npm run typecheck` | Checks the TypeScript types |

### How the project is laid out

```
app/                  Pages and API routes
  dashboard/          Home
  record/new/         The seven-step flow (new, continue, or edit)
  record/[id]/        One saved record
  affirmations/       Affirm
  trends/             Trends
  onboarding/         The "How ReFrame7 handles your data" notice
  auth/               Sign in, register, forgot and reset password
  api/                The AI routes (see below)
components/           The pieces the pages are built from
lib/
  ai.ts               Chooses the AI provider and falls back if one fails
  prompts.ts          What the AI is asked, for each feature
  crisis.ts           The crisis phrase list and support resources
  guest-records.ts    Records for people without an account (kept in the browser tab)
  pdf.ts              PDF export
  trends.ts           The numbers on the Trends page
  rate-limit.ts       Limits on how often the AI routes can be called
  supabase/           Supabase clients
supabase/             Database schema and migrations
evals/                Quality tests for the AI (see below)
types/index.ts        Shared TypeScript types
```

### The AI routes

| Route | Purpose |
|---|---|
| `POST /api/suggest-moods` | Mood suggestions for step 2 |
| `POST /api/suggest-evidence` | Guiding questions for step 5 |
| `POST /api/generate-balanced` | The balanced-thought draft for step 6 |
| `POST /api/detect-similarity` | Finds a similar earlier record |
| `POST /api/analyze-patterns` | Thinking patterns on Trends |
| `POST /api/crisis-check` | Returns whether text matches the crisis phrase list |

They are open to visitors without an account, so two limits apply: 20 requests per visitor every
10 minutes, and 400 a day across everyone. These limits are kept in memory, which makes them a
deterrent, not a guarantee. **Set a spending limit with your AI provider.**

### Testing the AI's quality (evals)

AI doesn't give the same answer twice, so trying it once isn't enough. `evals/balanced-thought/`
holds a test set for the balanced-thought feature:

- `cases.json` holds 25 test records: ordinary ones, and difficult ones such as a health worry,
  missing evidence, a worry that's largely justified, and text that tries to give the AI
  instructions. `cases.md` is the same set in a readable form.
- `run-eval.mjs` sends each case through the app's real route, then marks the answer. Code checks
  the length, hidden instructions and the crisis check. An AI judge marks seven things, including
  whether the answer sticks to what the person wrote, is honest, and avoids medical claims.

With the app running, from the project folder:

```bash
node evals/balanced-thought/run-eval.mjs --flow .claude/hillclimb/balanced-thought --variant baseline --concurrency 2
```

The first run, and any run after the script or the prompts change, needs `--approve-harness` added
by a person who has reviewed the change.

`evals/crisis-check/run.cjs` tests the crisis check itself. It is plain code, so it is exact, free and
instant: it confirms that a list of crisis phrases is caught and that ordinary phrases are not.

```bash
node evals/crisis-check/run.cjs
```

### Before putting it online

- Add the same environment variables on your host.
- Add your live address to Supabase's Site URL and Redirect URLs.
- Supabase's built-in email sender only allows a few emails an hour. For real sign-up traffic,
  connect your own email provider in Supabase.
- AI calls can take 20–30 seconds. The AI routes ask the host for up to 60 seconds; check that your
  hosting plan allows that.
- The data notice tells users their entries are not used to train AI. Make sure that is true of
  whichever AI provider and plan you deploy with.

---

## Credit

The seven-column Thought Record was developed by Christine A. Padesky (1983) and appears in
*Mind Over Mood*, Second Edition (Greenberger & Padesky, 2016). ReFrame7 is an independent tool and
is not affiliated with or endorsed by the authors or publisher.
