"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserPreferences } from "@/types";

export function OnboardingForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSaving(true);
    setError(null);

    // AI suggestions are part of the app once the notice is accepted.
    const data: UserPreferences = { privacy_accepted: true, ai_enabled: true };
    const { error: updateError } = await createClient().auth.updateUser({ data });

    if (updateError) {
      setSaving(false);
      return setError(updateError.message);
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="button" className="btn btn-primary" onClick={accept} disabled={saving}>
        {saving ? "Saving…" : "I understand and accept"}
      </button>
    </>
  );
}
