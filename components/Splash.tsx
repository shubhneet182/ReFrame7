"use client";

import { useEffect, useState } from "react";
import { CloudMascot } from "@/components/CloudMascot";

const VISIBLE_MS = 2800;
/** Matches the .splash opacity transition in globals.css. */
const FADE_MS = 500;

/**
 * Launch screen shown once per browser session. Rendered on the server so it
 * is the first thing painted; the script in layout.tsx hides it on later loads.
 */
export function Splash() {
  const [state, setState] = useState<"showing" | "leaving" | "gone">("showing");

  function dismiss() {
    try {
      sessionStorage.setItem("splash", "seen");
    } catch {
      // Private mode: it will simply show again on the next load.
    }
    setState((current) => (current === "showing" ? "leaving" : current));
    // Timed rather than on transitionend, which doesn't fire in a hidden tab.
    setTimeout(() => setState("gone"), FADE_MS);
  }

  useEffect(() => {
    if (document.documentElement.getAttribute("data-splash") === "seen") {
      setState("gone");
      return;
    }
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  if (state === "gone") return null;

  return (
    <div
      className={`splash ${state === "leaving" ? "leaving" : ""}`}
      onClick={dismiss}
    >
      <CloudMascot size={112} />
      <p className="mt-4 text-3xl font-semibold tracking-tight text-blue">ReFrame7</p>
      <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-text3">
        Your AI-guided CBT Thought Record. Turn unhelpful thought patterns into more balanced
        perspectives.
      </p>
    </div>
  );
}
