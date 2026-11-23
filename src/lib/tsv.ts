// Parses rows copied out of Google Sheets (tab-separated, quoted cells for multi-line text)
// and maps the county prospect sheet headers to the app's field names.

export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let atCellStart = true;
  const t = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && atCellStart) {
      inQuotes = true;
      atCellStart = false;
    } else if (ch === "\t") {
      row.push(cell);
      cell = "";
      atCellStart = true;
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      atCellStart = true;
    } else {
      cell += ch;
      atCellStart = false;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export const FIELD_FOR_HEADER = {
  business: "business",
  industry: "industry",
  town: "town",
  fit: "fit",
  status: "sheetStatus",
  "date sent": "dateSent",
  "follow-up due": "followUpDue",
  "first channel": "firstChannel",
  "switch channel on": "switchChannelOn",
  "second channel": "secondChannel",
  email: "email",
  phone: "phone",
  facebook: "facebook",
  website: "website",
  "built with": "builtWith",
  "what to mention": "whatToMention",
  "google rating": "googleRating",
  reviews: "reviews",
  "last review": "lastReview",
  notes: "sheetNotes",
} as const;

export type SheetField = (typeof FIELD_FOR_HEADER)[keyof typeof FIELD_FOR_HEADER];

export const SHEET_FIELDS = Object.values(FIELD_FOR_HEADER) as SheetField[];

export type SheetRow = Record<SheetField, string>;

export type ParseResult = {
  rows: SheetRow[];
  headerFound: boolean;
  unknownHeaders: string[];
  missingHeaders: string[];
};

const DEFAULT_ORDER: (SheetField | null)[] = SHEET_FIELDS; // The county sheets use this exact column order

/** Accepts a paste with or without the header row. Repeated header rows (from stacked tabs) are skipped. */
export function toSheetRows(text: string): ParseResult {
  const table = parseTsv(text);
  if (!table.length) return { rows: [], headerFound: false, unknownHeaders: [], missingHeaders: [] };
  const first = table[0].map((h) => h.trim().toLowerCase());
  const headerFound = first.includes("business") && (first.includes("phone") || first.includes("industry"));
  let order: (SheetField | null)[] = DEFAULT_ORDER;
  const unknownHeaders: string[] = [];
  let missingHeaders: string[] = [];
  if (headerFound) {
    order = first.map((h) => {
      const f = (FIELD_FOR_HEADER as Record<string, SheetField>)[h];
      if (!f && h) unknownHeaders.push(h);
      return f ?? null;
    });
    missingHeaders = SHEET_FIELDS.filter((f) => !order.includes(f));
  }
  const body = headerFound ? table.slice(1) : table;
  const rows: SheetRow[] = [];
  for (const r of body) {
    if (r[0]?.trim().toLowerCase() === "business") continue; // another header row
    const row = Object.fromEntries(SHEET_FIELDS.map((f) => [f, ""])) as SheetRow;
    order.forEach((field, i) => {
      if (field) row[field] = (r[i] ?? "").trim();
    });
    if (!row.business) continue;
    rows.push(row);
  }
  return { rows, headerFound, unknownHeaders, missingHeaders };
}
