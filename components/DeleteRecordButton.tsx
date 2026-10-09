"use client";

import { useState } from "react";
import { deleteGuestRecord } from "@/lib/guest-records";
import { createClient } from "@/lib/supabase/client";
import { truncate } from "@/lib/format";
import type { ThoughtRecord } from "@/types";

interface DeleteRecordButtonProps {
  record: ThoughtRecord;
  /** False for a guest, whose records live in the browser session. */
  signedIn: boolean;
  onDeleted: (id: string) => void;
}

/** Bin icon that asks for confirmation, then deletes the record for good. */
export function DeleteRecordButton({ record, signedIn, onDeleted }: DeleteRecordButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);

    let ok: boolean;
    if (signedIn) {
      const { error: deleteError } = await createClient()
        .from("thought_records")
        .delete()
        .eq("id", record.id);
      if (deleteError) console.error("[record] Delete failed:", deleteError.message);
      ok = !deleteError;
    } else {
      ok = deleteGuestRecord(record.id);
    }

    setBusy(false);
    if (!ok) return setError("Couldn't delete this record. Please try again.");
    setConfirming(false);
    onDeleted(record.id);
  }

  return (
    <>
      <button
        type="button"
        className="card-action card-action-delete"
        onClick={() => setConfirming(true)}
        aria-label="Delete this record"
        title="Delete"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <path
            d="M4 7h16M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1zM6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M10 11v5M14 11v5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {confirming && (
        <div
          className="modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <div className="modal">
            <h2 id="delete-title" className="text-lg font-semibold text-text">
              Delete this record?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text2">
              “{truncate(record.situation, 80) || "Untitled record"}”
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text3">
              It will be removed for good, along with its balanced thought on the Affirm tab. This
              can&apos;t be undone.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
              {busy ? "Deleting…" : "Delete record"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirming(false)}
              disabled={busy}
              autoFocus
            >
              Keep it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
