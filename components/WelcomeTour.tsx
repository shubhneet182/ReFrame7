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

export function WelcomeTour({ aiEnabled }: { aiEnabled: boolean }) {
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
          {aiEnabled
            ? "AI can suggest mood labels, questions and a balanced thought. Every suggestion is labelled, and nothing is added to your record unless you choose it."
            : "AI suggestions are off, so every word in your record is your own. You can fill each step at your own pace."}{" "}
          Your progress is saved at each step, so you can pause and come back later.
        </p>
      ),
    },
    {
      title: "Your records build on each other",
      body: (
        <>
          <p>
            Completed records are kept here. When a new situation resembles an earlier one, your
            own past balanced thought is shown again as a reminder.
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

  // Shown once: remembered on the account, not the device.
  async function close(startRecord: boolean) {
    setClosing(true);
    const data: UserPreferences = { tour_seen: true };
    await createClient().auth.updateUser({ data });
    if (startRecord) router.push("/record/new");
    router.refresh();
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
