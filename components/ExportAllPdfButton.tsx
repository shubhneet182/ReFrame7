"use client";

import { useState } from "react";
import type { ThoughtRecord } from "@/types";

/** Exports every record as one table, one row per record. */
export function ExportAllPdfButton({ records }: { records: ThoughtRecord[] }) {
  const [busy, setBusy] = useState(false);

  async function exportAll() {
    setBusy(true);
    try {
      // Loaded on demand so jsPDF stays out of the main bundle.
      const { exportAllRecordsPdf } = await import("@/lib/pdf");
      exportAllRecordsPdf(records);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="card-action" onClick={exportAll} disabled={busy}>
      {busy ? "Preparing…" : "Export all as PDF"}
    </button>
  );
}
