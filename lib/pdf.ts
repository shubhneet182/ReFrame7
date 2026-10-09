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

const FOOTER_SIZE = 7.5;
const FOOTER =
  "A self-help record made with ReFrame7. Not a substitute for professional care. " +
  "The seven-column Thought Record was developed by Christine A. Padesky (1983) and appears in " +
  "Mind Over Mood, Second Edition (Greenberger & Padesky, 2016). ReFrame7 is an independent tool " +
  "and is not affiliated with or endorsed by the authors or publisher.";

function moodLines(moods: Mood[]): string {
  return moods
    .map((m) => `${m.emotion} ${m.intensity}%${m.examine ? " (examined)" : ""}`)
    .join("\n");
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
  // Footer: the self-help note and the credit for the method, under the table.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FOOTER_SIZE);
  const footer = doc.splitTextToSize(FOOTER, tableWidth) as string[];
  const footerHeight = footer.length * FOOTER_SIZE * 1.3;
  const tableBottom = pageHeight - MARGIN - footerHeight - 8;
  const linesPerPage = Math.floor((tableBottom - tableTop - headerHeight - PAD * 2) / LINE);
  const pages = Math.max(1, Math.ceil(Math.max(...columns.map((c) => c.length)) / linesPerPage));

  const date = new Date(record.created_at).toLocaleDateString("en-CA", { dateStyle: "long" });
  // Shown as the document's name in PDF viewers and browser tabs.
  doc.setProperties({ title: `ReFrame7 | Thought Record ${date}` });

  for (let page = 0; page < pages; page += 1) {
    if (page > 0) doc.addPage();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ReFrame7 | Thought Record", MARGIN, MARGIN + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(date + (pages > 1 ? ` · page ${page + 1} of ${pages}` : ""), MARGIN, MARGIN + 24);

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

    doc.setFont("helvetica", "normal");
    doc.setFontSize(FOOTER_SIZE);
    doc.setTextColor(110);
    doc.text(footer, MARGIN, tableBottom + 8 + FOOTER_SIZE, { lineHeightFactor: 1.3 });
    doc.setTextColor(0);
  }

  // "|" isn't allowed in Windows file names, so the saved file uses a dash.
  doc.save(`ReFrame7 - Thought Record ${record.created_at.slice(0, 10)}.pdf`);
}

/**
 * Every record in one landscape table: the same seven columns, one row per
 * record (newest first), flowing over as many pages as it needs. A row too
 * tall for the space left carries on at the top of the next page.
 */
export function exportAllRecordsPdf(records: ThoughtRecord[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const tableWidth = pageWidth - MARGIN * 2;
  const totalWeight = WEIGHTS.reduce((sum, w) => sum + w, 0);
  const widths = WEIGHTS.map((w) => (w / totalWeight) * tableWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(BODY_SIZE);
  const headerLines = HEADERS.map(
    (text, i) => doc.splitTextToSize(text, widths[i] - PAD * 2) as string[],
  );
  const headerHeight = Math.max(...headerLines.map((l) => l.length)) * LINE + PAD * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FOOTER_SIZE);
  const footer = doc.splitTextToSize(FOOTER, tableWidth) as string[];
  const footerHeight = footer.length * FOOTER_SIZE * 1.3;

  const tableTop = MARGIN + 34;
  const tableBottom = pageHeight - MARGIN - footerHeight - 8;
  const bodyTop = tableTop + headerHeight;

  const exported = new Date().toLocaleDateString("en-CA", { dateStyle: "long" });
  doc.setProperties({ title: `ReFrame7 | Thought Records ${exported}` });

  // Each row: the record's cells, with its date leading the first column.
  const sorted = [...records].sort((a, b) => b.created_at.localeCompare(a.created_at));
  doc.setFontSize(BODY_SIZE);
  const rows = sorted.map((record) => {
    const date = new Date(record.created_at).toLocaleDateString("en-CA", { dateStyle: "medium" });
    const texts = cells(record);
    texts[0] = `${date}${record.is_complete ? "" : " (in progress)"}\n${texts[0]}`;
    return texts.map((text, i) => doc.splitTextToSize(text || "—", widths[i] - PAD * 2) as string[]);
  });

  function startPage() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ReFrame7 | Thought Records", MARGIN, MARGIN + 10);

    doc.setDrawColor(120);
    doc.setLineWidth(0.6);
    doc.rect(MARGIN, tableTop, tableWidth, tableBottom - tableTop);
    doc.line(MARGIN, bodyTop, MARGIN + tableWidth, bodyTop);

    let x = MARGIN;
    doc.setFontSize(BODY_SIZE);
    widths.forEach((width, i) => {
      if (i > 0) doc.line(x, tableTop, x, tableBottom);
      doc.text(headerLines[i], x + PAD, tableTop + PAD + BODY_SIZE);
      x += width;
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(FOOTER_SIZE);
    doc.setTextColor(110);
    doc.text(footer, MARGIN, tableBottom + 8 + FOOTER_SIZE, { lineHeightFactor: 1.3 });
    doc.setTextColor(0);
    doc.setFontSize(BODY_SIZE);
  }

  startPage();
  let y = bodyTop;

  for (const row of rows) {
    const rowLines = Math.max(...row.map((cell) => cell.length));
    let offset = 0;

    while (offset < rowLines) {
      let room = Math.floor((tableBottom - y - PAD * 2) / LINE);
      // Don't start a row with only a line or two left on the page.
      if (room < Math.min(3, rowLines - offset)) {
        doc.addPage();
        startPage();
        y = bodyTop;
        room = Math.floor((tableBottom - y - PAD * 2) / LINE);
      }
      const take = Math.min(room, rowLines - offset);

      let x = MARGIN;
      row.forEach((cell, i) => {
        const slice = cell.slice(offset, offset + take);
        if (slice.length > 0) {
          doc.text(slice, x + PAD, y + PAD + BODY_SIZE, { lineHeightFactor: 1.35 });
        }
        x += widths[i];
      });

      offset += take;
      y += take * LINE + PAD * 2;

      if (offset < rowLines) {
        // The rest of this row continues on a fresh page.
        doc.addPage();
        startPage();
        y = bodyTop;
      } else if (y < tableBottom - 1) {
        doc.line(MARGIN, y, MARGIN + tableWidth, y);
      }
    }
  }

  // Page numbers, now that the page count is known.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const count = `${records.length} ${records.length === 1 ? "record" : "records"}`;
    doc.text(
      `${count} · exported ${exported}` + (pages > 1 ? ` · page ${page} of ${pages}` : ""),
      MARGIN,
      MARGIN + 24,
    );
  }

  doc.save(`ReFrame7 - Thought Records ${new Date().toISOString().slice(0, 10)}.pdf`);
}
