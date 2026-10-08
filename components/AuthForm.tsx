"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "login" | "register";
  initialNotice?: string;
}

export function AuthForm({ mode, initialNotice }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const [loading, setLoading] = useState(false);
  // Set once we know this email is waiting on its confirmation link.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setUnconfirmed(false);
    setLoading(true);

    const supabase = createClient();

    if (isRegister) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (signUpError) return setError(signUpError.message);
      if (!data.session) {
        setUnconfirmed(true);
        return setNotice("Check your email for a confirmation link to finish signing up.");
      }
      router.push("/onboarding");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (signInError) {
        if (signInError.code === "email_not_confirmed") {
          setUnconfirmed(true);
          return setError("Your email isn't confirmed yet. Open the link we sent you, or resend it.");
        }
        return setError(signInError.message);
      }
      router.push("/dashboard");
    }
    router.refresh();
  }

  async function resendConfirmation() {
    setResending(true);
    setError(null);
    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResending(false);
    if (resendError) return setError(resendError.message);
    setNotice("Confirmation email sent again. It can take a minute to arrive.");
  }

  return (
    <AuthShell
      subtitle={
        isRegister
          ? "Create an account to start your thought records."
          : "Sign in to continue your thought records."
      }
    >
      <form onSubmit={onSubmit}>
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="field mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <div className="mb-1.5 flex items-baseline justify-between">
          <label className="field-label mb-0" htmlFor="password">
            Password
          </label>
          {!isRegister && (
            <Link href="/auth/forgot-password" className="text-xs text-blue">
              Forgot password?
            </Link>
          )}
        </div>
        <input
          id="password"
          type="password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={8}
          required
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-2 text-xs text-sage" role="status">
            {notice}
          </p>
        )}

        <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
          {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
        </button>

        {unconfirmed && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={resendConfirmation}
            disabled={resending}
          >
            {resending ? "Sending…" : "Resend confirmation email"}
          </button>
        )}
      </form>

      <p className="mt-4 text-center text-xs text-text3">
        {isRegister ? "Already have an account? " : "New to ReFrame7? "}
        <Link href={isRegister ? "/auth/login" : "/auth/register"} className="text-blue">
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-text3">
        <Link href="/dashboard" className="text-blue">
          Continue without an account
        </Link>
      </p>
    </AuthShell>
  );
}
