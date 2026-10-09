"use client";

import { useEffect, useState } from "react";
import { AppName } from "@/components/AppName";

/** Matches the .splash opacity transition in globals.css. */
const FADE_MS = 500;

/**
 * Welcome screen for first-time visitors. It covers the data-handling notice
 * until "Let's get started" is pressed. Rendered on the server so it is the
 * first thing painted; the script in layout.tsx keeps it hidden on reloads
 * within the same session.
 */
export function Splash() {
  const [state, setState] = useState<"showing" | "leaving" | "gone">("showing");

  useEffect(() => {
    if (document.documentElement.getAttribute("data-splash") === "seen") setState("gone");
  }, []);

  function start() {
    try {
      sessionStorage.setItem("splash", "seen");
    } catch {
      // Private mode: it will simply show again on the next load.
    }
    setState("leaving");
    // Timed rather than on transitionend, which doesn't fire in a hidden tab.
    setTimeout(() => setState("gone"), FADE_MS);
  }

  if (state === "gone") return null;

  return (
    <div className={`splash ${state === "leaving" ? "leaving" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static icon */}
      <img src="/icons/icon-192.png" alt="" width={112} height={112} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-blue">
        <AppName />
      </h1>
      <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-text3">
        Your AI-guided CBT Thought Record. Turn unhelpful thought patterns into more balanced
        perspectives.
      </p>
      <button type="button" className="btn btn-primary mt-8 max-w-xs" onClick={start} autoFocus>
        Let&apos;s get started
      </button>
    </div>
  );
}
