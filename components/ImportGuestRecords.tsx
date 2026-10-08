"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearGuestRecords, loadGuestRecords } from "@/lib/guest-records";
import { createClient } from "@/lib/supabase/client";
import type { ThoughtRecord, ThoughtRecordInsert } from "@/types";

/** After signing in, offers to move records made as a guest into the account. */
export function ImportGuestRecords({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<ThoughtRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPending(loadGuestRecords()), []);

  if (pending.length === 0) return null;

  async function save() {
    setBusy(true);
    setError(null);

    const rows: (ThoughtRecordInsert & { created_at: string })[] = pending.map(
      ({ id: _id, updated_at: _updated, ...record }) => ({
        ...record,
        user_id: userId,
        // Guest ids don't exist in the database, so the link can't carry over.
        similar_record_id: null,
      }),
    );
    const { error: insertError } = await createClient().from("thought_records").insert(rows);

    setBusy(false);
    if (insertError) {
      console.error("[import] Failed to save guest records:", insertError.message);
      return setError("Couldn't save them to your account. Please try again.");
    }
    clearGuestRecords();
    setPending([]);
    router.refresh();
  }

  return (
    <div className="consent-card">
      <p className="mb-1 text-sm font-medium text-text">
        {pending.length === 1
          ? "You made 1 record before signing in"
          : `You made ${pending.length} records before signing in`}
      </p>
      <p className="text-xs leading-relaxed text-text3">
        They are only in this browser tab for now. Save them to your account to keep them.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save to my account"}
      </button>
    </div>
  );
}
