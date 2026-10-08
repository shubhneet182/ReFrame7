"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPrivacyCookie } from "@/lib/privacy";
import { createClient } from "@/lib/supabase/client";
import type { UserPreferences } from "@/types";

export function OnboardingForm({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSaving(true);
    setError(null);

    // Signed-in users also get it remembered on their account, so it
    // follows them to other devices.
    if (signedIn) {
      const data: UserPreferences = { privacy_accepted: true, ai_enabled: true };
      const { error: updateError } = await createClient().auth.updateUser({ data });
      if (updateError) {
        setSaving(false);
        return setError(updateError.message);
      }
    }

    setPrivacyCookie();
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
