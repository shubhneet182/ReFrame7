import { jsPDF } from "jspdf";
import type { Mood, ThoughtRecord } from "@/types";

function formatMoods(moods: Mood[]): string {
  return moods.map((m) => `${m.emotion} ${m.intensity}%`).join(", ");
}

export function exportRecordPdf(record: ThoughtRecord) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const write = (text: string, size: number, style: "normal" | "bold", gap: number) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || "—", width) as string[];
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size * 1.4;
    }
    y += gap;
  };

  const section = (label: string, body: string) => {
    write(label, 10, "bold", 0);
    write(body, 11, "normal", 12);
  };

  write("ReFrame7 — Thought Record", 18, "bold", 2);
  write(new Date(record.created_at).toLocaleString(), 10, "normal", 16);

  section("1. Situation", record.situation);
  section("2. Moods", formatMoods(record.moods));
  section("3. Automatic thoughts", record.automatic_thoughts);
  section("Hot thought", record.hot_thought);
  section("4. Evidence for the hot thought", record.evidence_for);
  section("5. Evidence against the hot thought", record.evidence_against);
  section("6. Balanced thought", record.balanced_thought);
  if (record.balanced_thought_ai) {
    section("AI-generated suggestion (for reference)", record.balanced_thought_ai);
  }
  section("7. Outcome moods", formatMoods(record.outcome_moods));

  doc.save(`reframe7-${record.created_at.slice(0, 10)}.pdf`);
}
