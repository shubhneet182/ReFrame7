"use client";

import { useState } from "react";
import type { ThoughtRecord } from "@/types";

interface ExportPdfButtonProps {
  record: ThoughtRecord;
  /** Small inline action (for record cards) instead of a full-width button. */
  compact?: boolean;
}

export function ExportPdfButton({ record, compact = false }: ExportPdfButtonProps) {
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    setBusy(true);
    try {
      // Loaded on demand so jsPDF stays out of the main bundle.
      const { exportRecordPdf } = await import("@/lib/pdf");
      exportRecordPdf(record);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={compact ? "card-action" : "btn btn-ghost"}
      onClick={exportPdf}
      disabled={busy}
    >
      {busy ? "Preparing…" : compact ? "Export PDF" : "Export as PDF"}
    </button>
  );
}
