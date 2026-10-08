import { jsPDF } from "jspdf";
import type { Mood, ThoughtRecord } from "@/types";

const HEADERS = [
  "1. Situation",
  "2. Moods",
  "3. Automatic thoughts",
  "4. Evidence that supports the hot thought",
  "5. Evidence that does not support the hot thought",
  "6. Alternative / balanced thought",
  "7. Rate moods now",
];
/** Relative column widths, in the order above. */
const WEIGHTS = [1.1, 0.8, 1.3, 1.3, 1.3, 1.3, 0.8];

const MARGIN = 28;
const PAD = 5;
const BODY_SIZE = 8.5;
const LINE = BODY_SIZE * 1.35;

function moodLines(moods: Mood[]): string {
  return moods.map((m) => `${m.emotion} ${m.intensity}%`).join("\n");
}

function cells(record: ThoughtRecord): string[] {
  const thoughts = [
    record.automatic_thoughts.trim(),
    record.hot_thought.trim() && `Hot thought:\n${record.hot_thought.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const balanced = [
    record.balanced_thought.trim(),
    record.balanced_belief !== null && `Belief in this thought: ${record.balanced_belief}%`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    record.situation.trim(),
    moodLines(record.moods),
    thoughts,
    record.evidence_for.trim(),
    record.evidence_against.trim(),
    balanced,
    moodLines(record.outcome_moods),
  ];
}

/** Landscape seven-column worksheet, continued over extra pages if a column runs long. */
export function exportRecordPdf(record: ThoughtRecord) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const tableWidth = pageWidth - MARGIN * 2;
  const totalWeight = WEIGHTS.reduce((sum, w) => sum + w, 0);
  const widths = WEIGHTS.map((w) => (w / totalWeight) * tableWidth);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_SIZE);
  const columns = cells(record).map(
    (text, i) => doc.splitTextToSize(text || "—", widths[i] - PAD * 2) as string[],
  );

  doc.setFont("helvetica", "bold");
  const headerLines = HEADERS.map(
    (text, i) => doc.splitTextToSize(text, widths[i] - PAD * 2) as string[],
  );
  const headerHeight = Math.max(...headerLines.map((l) => l.length)) * LINE + PAD * 2;

  const tableTop = MARGIN + 34;
  const tableBottom = pageHeight - MARGIN - 14;
  const linesPerPage = Math.floor((tableBottom - tableTop - headerHeight - PAD * 2) / LINE);
  const pages = Math.max(1, Math.ceil(Math.max(...columns.map((c) => c.length)) / linesPerPage));

  for (let page = 0; page < pages; page += 1) {
    if (page > 0) doc.addPage();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Thought Record", MARGIN, MARGIN + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `ReFrame7 · ${new Date(record.created_at).toLocaleDateString("en-CA", { dateStyle: "long" })}` +
        (pages > 1 ? ` · page ${page + 1} of ${pages}` : ""),
      MARGIN,
      MARGIN + 24,
    );

    // Grid: outer box, header rule, column rules.
    doc.setDrawColor(120);
    doc.setLineWidth(0.6);
    doc.rect(MARGIN, tableTop, tableWidth, tableBottom - tableTop);
    doc.line(MARGIN, tableTop + headerHeight, MARGIN + tableWidth, tableTop + headerHeight);

    let x = MARGIN;
    widths.forEach((width, i) => {
      if (i > 0) doc.line(x, tableTop, x, tableBottom);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(BODY_SIZE);
      doc.text(headerLines[i], x + PAD, tableTop + PAD + BODY_SIZE);

      doc.setFont("helvetica", "normal");
      const slice = columns[i].slice(page * linesPerPage, (page + 1) * linesPerPage);
      doc.text(slice, x + PAD, tableTop + headerHeight + PAD + BODY_SIZE, {
        lineHeightFactor: 1.35,
      });
      x += width;
    });

    doc.setFontSize(7.5);
    doc.setTextColor(110);
    doc.text(
      "A self-help record made with ReFrame7. Not a substitute for professional care.",
      MARGIN,
      pageHeight - MARGIN,
    );
    doc.setTextColor(0);
  }

  doc.save(`reframe7-thought-record-${record.created_at.slice(0, 10)}.pdf`);
}
