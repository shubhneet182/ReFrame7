"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { AppName } from "@/components/AppName";
import { CloudMascot } from "@/components/CloudMascot";
import { createClient } from "@/lib/supabase/client";
import type { UserPreferences } from "@/types";

export const TOUR_SEEN_KEY = "rf7_tour_seen";
/** Where the tour has got to, so it can carry on across pages. */
const TOUR_INDEX_KEY = "rf7_tour_index";

export type TourRoute = "/dashboard" | "/record/new";

interface TourStep {
  /** The page this stop is on. */
  route: TourRoute;
  /** `data-tour` value of the element to point at; omitted for a centred card. */
  target?: string;
  /** On the record page: which of the seven steps to show behind the card. */
  recordStep?: number;
  title: React.ReactNode;
  body: React.ReactNode;
}

function recordStep(n: number, title: string, text: string): TourStep {
  return {
    route: "/record/new",
    target: "flow-edit",
    recordStep: n,
    title: `Step ${n}: ${title}`,
    body: <p>{text}</p>,
  };
}

const STEPS: TourStep[] = [
  {
    route: "/dashboard",
    title: (
      <>
        Welcome to <AppName />
      </>
    ),
    body: (
      <p>
        Sometimes a thought can feel overwhelming or hard to shake. A thought record helps you slow
        down, work through what&apos;s on your mind, and see things more clearly. Let&apos;s take
        a quick look around.
      </p>
    ),
  },
  {
    route: "/dashboard",
    target: "tab-home",
    title: "Home",
    body: (
      <p>
        All your thought records live here. Open any record to read it, make changes, or export it
        as a PDF worksheet.
      </p>
    ),
  },
  {
    route: "/dashboard",
    target: "tab-record",
    title: "Record",
    body: (
      <p>
        This is where you work through a thought, one small step at a time. It&apos;s based on
        cognitive behavioural therapy (CBT), an approach that helps you understand how the way you
        think about a situation can shape how you feel about it. Let&apos;s step inside and look
        at each of its seven steps.
      </p>
    ),
  },
  recordStep(
    1,
    "Situation",
    "Start with what happened: where you were, who you were with, what you were doing, and when it happened. Stick to the facts, as if you were describing a photo.",
  ),
  recordStep(
    2,
    "Moods",
    "Name what you felt and use the slider to show how strong it was. AI suggests some moods to pick from, and you can always add your own. Then choose the one mood you want to examine.",
  ),
  recordStep(
    3,
    "Automatic thoughts",
    "Write down what ran through your mind in the moment, unfiltered. Then pick the one that stings the most. That is your “hot thought”, and the rest of the record works on it.",
  ),
  recordStep(
    4,
    "Evidence for the hot thought",
    "List the facts that support the hot thought. Focus on what you know for sure, rather than assumptions about what someone else is thinking.",
  ),
  recordStep(
    5,
    "Evidence against the hot thought",
    "Now list the facts that don’t fit the hot thought: exceptions, past experiences, what you would say to a friend. If you’re stuck, use AI to help you get started.",
  ),
  recordStep(
    6,
    "Balanced thought",
    "Bring together what you’ve learned to find a more balanced way to see the situation. AI can help you get started, and you can make it your own. Then rate how much you believe it.",
  ),
  recordStep(
    7,
    "How you feel now",
    "Rate the same moods again. Seeing the numbers move, even a little, shows you what the last ten minutes changed.",
  ),
  {
    route: "/dashboard",
    target: "tab-affirm",
    title: "Affirm",
    body: (
      <p>
        Every balanced thought you write is kept here. When you write about a similar situation,
        your earlier balanced thought will appear as a helpful reminder of a perspective that
        worked for you before.
      </p>
    ),
  },
  {
    route: "/dashboard",
    target: "tab-trends",
    title: "Trends",
    body: (
      <p>
        See how your moods shift from the start of a record to the end, and ask AI to point out
        thinking habits that come up more than once.
      </p>
    ),
  },
  {
    route: "/dashboard",
    target: "start",
    title: "Before you begin",
    body: (
      <>
        <p>
          ReFrame7 is a self-help tool designed to support reflection and emotional well-being. It
          is not a substitute for professional mental health care.
        </p>
        <p className="mt-2">
          If you&apos;re going through a difficult time and need support, call or text 9-8-8
          anytime in Canada. If you&apos;re in immediate danger, call 9-1-1.
        </p>
      </>
    ),
  },
];

/** The stop a tour in progress should resume at on this page, or null. */
export function tourIndexFor(route: TourRoute): number | null {
  try {
    const raw = sessionStorage.getItem(TOUR_INDEX_KEY);
    if (raw === null) return null;
    const index = Number(raw);
    return STEPS[index]?.route === route ? index : null;
  } catch {
    return null;
  }
}

function storeIndex(index: number | null) {
  try {
    if (index === null) sessionStorage.removeItem(TOUR_INDEX_KEY);
    else sessionStorage.setItem(TOUR_INDEX_KEY, String(index));
  } catch {
    // Without storage the tour just can't carry on across pages.
  }
}

const CARD_WIDTH = 320;
const GAP = 14;
const PAD = 6;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The visible element for a tour target (tabs exist twice: bottom bar and header). */
function findTarget(name: string): Element | undefined {
  return Array.from(document.querySelectorAll(`[data-tour="${name}"]`)).find(
    (el) => el.getClientRects().length > 0,
  );
}

interface WelcomeTourProps {
  /** The page this instance is mounted on. */
  route: TourRoute;
  startIndex?: number;
  signedIn: boolean;
  onClose: () => void;
  /** Record page only: asks the flow to show a step (or null when leaving). */
  onRecordStep?: (step: number | null) => void;
}

/**
 * Walkthrough: a spotlight moves across the real tabs, then steps inside a
 * record to explain each of the seven steps, then returns to the home screen.
 */
export function WelcomeTour({
  route,
  startIndex = 0,
  signedIn,
  onClose,
  onRecordStep,
}: WelcomeTourProps) {
  const router = useRouter();
  const [index, setIndex] = useState(startIndex);
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  useEffect(() => {
    onRecordStep?.(step.recordStep ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useLayoutEffect(() => {
    function measure() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      const el = step.target ? findTarget(step.target) : undefined;
      if (!el) return setBox(null);
      const r = el.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    const el = step.target ? findTarget(step.target) : undefined;
    el?.scrollIntoView({ block: "nearest" });
    measure();
    // Measure again shortly after: on the record page the step being
    // explained is drawn just after this runs, which changes its size.
    const settle = setTimeout(measure, 80);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(settle);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  // Escape skips the tour.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(target: number) {
    storeIndex(target);
    if (STEPS[target].route === route) return setIndex(target);
    // The next stop is on another page; the tour picks up again there.
    setBusy(true);
    router.push(STEPS[target].route);
  }

  // Shown once: remembered on the account, or on this device for guests.
  async function close(startRecord: boolean) {
    setBusy(true);
    storeIndex(null);
    if (signedIn) {
      const data: UserPreferences = { tour_seen: true };
      await createClient().auth.updateUser({ data });
    } else {
      try {
        localStorage.setItem(TOUR_SEEN_KEY, "1");
      } catch {
        // Private mode: the tour will just show again next time.
      }
    }
    onRecordStep?.(null);
    onClose();
    if (startRecord && route !== "/record/new") router.push("/record/new");
    else if (!startRecord) router.refresh();
  }

  // Card position: under the highlighted element if there is room, else above it.
  const width = Math.min(CARD_WIDTH, viewport.width - 32);
  let cardStyle: React.CSSProperties;
  if (box) {
    const left = Math.min(
      Math.max(16, box.left + box.width / 2 - width / 2),
      viewport.width - width - 16,
    );
    const roomBelow = viewport.height - (box.top + box.height);
    // Never taller than the space beside the highlight; long text scrolls inside.
    cardStyle =
      roomBelow > box.top
        ? { width, left, top: box.top + box.height + PAD + GAP, maxHeight: roomBelow - PAD - GAP - 16 }
        : {
            width,
            left,
            bottom: viewport.height - box.top + PAD + GAP,
            maxHeight: box.top - PAD - GAP - 16,
          };
  } else {
    cardStyle = { width, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="A quick look around ReFrame7">
      {/* Dims the page; the spotlight's own shadow does it when one is showing. */}
      <div className={`tour-blocker ${box ? "" : "dim"}`} />

      {box && (
        <div
          className="tour-spotlight"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
          }}
        />
      )}

      <section className="tour-card" style={cardStyle}>
        {!box && !step.target && (
          <div className="mb-2 flex justify-center">
            <CloudMascot size={56} />
          </div>
        )}
        <p className="tour-count">
          {index + 1} of {STEPS.length}
        </p>
        <h2 className="mb-1.5 text-base font-semibold text-blue">{step.title}</h2>
        <div className="tour-body text-sm leading-relaxed text-text2">{step.body}</div>

        <div className="mt-3 flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="mr-auto text-xs text-text3 underline"
            onClick={() => close(false)}
            disabled={busy}
          >
            Skip tour
          </button>
          {index > 0 && (
            <button
              type="button"
              className="btn btn-ghost mt-0 w-auto px-4 py-2"
              onClick={() => go(index - 1)}
              disabled={busy}
            >
              Back
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              className="btn btn-primary mt-0 w-auto px-4 py-2"
              onClick={() => close(true)}
              disabled={busy}
              autoFocus
            >
              Start my first record
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary mt-0 w-auto px-4 py-2"
              onClick={() => go(index + 1)}
              disabled={busy}
              autoFocus
            >
              Next
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
