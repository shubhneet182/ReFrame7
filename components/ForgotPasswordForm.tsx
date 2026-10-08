"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);
    if (resetError) return setError(resetError.message);
    setSent(true);
  }

  return (
    <AuthShell subtitle="Enter your email and we'll send you a link to set a new password.">
      <form onSubmit={onSubmit}>
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {sent && (
          <p className="mt-2 text-xs text-sage" role="status">
            If an account exists for that email, a reset link is on its way. Open it in this
            browser.
          </p>
        )}

        <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
          {loading ? "Please wait…" : sent ? "Send again" : "Send reset link"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-text3">
        <Link href="/auth/login" className="text-blue">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
