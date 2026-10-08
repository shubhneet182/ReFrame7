"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloudMascot } from "@/components/CloudMascot";
import { createClient } from "@/lib/supabase/client";
import type { UserPreferences } from "@/types";

const COLUMNS = [
  "Situation — what happened",
  "Moods — what you felt, and how strongly",
  "Automatic thoughts — what went through your mind",
  "Evidence for your most distressing thought",
  "Evidence against it",
  "Balanced thought — a fairer way to see it",
  "Outcome — how you feel now",
];

export const TOUR_SEEN_KEY = "rf7_tour_seen";

interface WelcomeTourProps {
  signedIn: boolean;
  onClose: () => void;
}

export function WelcomeTour({ signedIn, onClose }: WelcomeTourProps) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [closing, setClosing] = useState(false);

  const slides = [
    {
      title: "Welcome to ReFrame7",
      body: (
        <p>
          A thought record is a CBT tool for stepping back from a distressing thought and looking
          at it more clearly. Each one takes about ten minutes.
        </p>
      ),
    },
    {
      title: "Seven short steps",
      body: (
        <ol className="list-decimal space-y-1 pl-5 text-left">
          {COLUMNS.map((column) => (
            <li key={column}>{column}</li>
          ))}
        </ol>
      ),
    },
    {
      title: "You're always in control",
      body: (
        <p>
          AI can suggest mood labels, questions and a balanced thought. Every suggestion is
          labelled, and nothing is added to your record unless you choose it. Your progress is
          saved at each step.
        </p>
      ),
    },
    {
      title: "Your records build on each other",
      body: (
        <>
          <p>
            When a new situation resembles an earlier one, your own past balanced thought is shown
            again as a reminder.{" "}
            {signedIn
              ? "Your records are saved to your account."
              : "Without an account, records last until you close this tab. Sign in to keep them."}
          </p>
          <p className="mt-2">
            ReFrame7 is a self-help tool, not a replacement for professional care. If you are in
            crisis, call or text 9-8-8 at any time.
          </p>
        </>
      ),
    },
  ];

  const isLast = slide === slides.length - 1;

  // Shown once: remembered on the account, or on this device for guests.
  async function close(startRecord: boolean) {
    setClosing(true);
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
    onClose();
    if (startRecord) router.push("/record/new");
    else router.refresh();
  }

  return (
    <section className="card text-center" aria-label="How ReFrame7 works">
      <div className="mb-2 flex justify-center">
        <CloudMascot size={56} />
      </div>
      <h2 className="mb-2 text-base font-semibold text-blue">{slides[slide].title}</h2>
      <div className="min-h-[9.5rem] text-sm leading-relaxed text-text2">{slides[slide].body}</div>

      <div className="my-3 flex justify-center gap-1.5" aria-hidden="true">
        {slides.map((s, index) => (
          <span
            key={s.title}
            className={`h-1.5 w-1.5 rounded-full ${index === slide ? "bg-blue" : "bg-border2"}`}
          />
        ))}
      </div>

      {isLast ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => close(true)}
          disabled={closing}
        >
          Start my first record
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => setSlide(slide + 1)}>
          Next
        </button>
      )}

      {slide > 0 && (
        <button type="button" className="btn btn-ghost" onClick={() => setSlide(slide - 1)}>
          Back
        </button>
      )}

      <button
        type="button"
        className="mt-3 text-xs text-text3 underline"
        onClick={() => close(false)}
        disabled={closing}
      >
        Skip tour
      </button>
    </section>
  );
}
