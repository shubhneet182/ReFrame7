"use client";

import { useState } from "react";
import type { ThoughtRecord } from "@/types";

export function ExportPdfButton({ record }: { record: ThoughtRecord }) {
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
    <button type="button" className="btn btn-ghost" onClick={exportPdf} disabled={busy}>
      {busy ? "Preparing PDF…" : "Export as PDF"}
    </button>
  );
}
