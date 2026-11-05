export type ImportFormatId = "capitalOne" | "chase";

/**
 * What a CSV row means for posting. Only `charge` rows are postable; `payment` and `refund`
 * rows are persisted as skipped and never posted.
 */
export type ImportRowKind = "charge" | "payment" | "refund";

export type ImportCsvRow = {
  formatId: ImportFormatId;
  /** Line number in the file, counting the header as line 1, so it matches a spreadsheet. */
  rowNumber: number;
  /** ISO 8601 date (yyyy-MM-dd). */
  transactionDate: string;
  postedDate: string;
  last4: string;
  description: string;
  category: string;
  /** Always the positive magnitude. The direction is carried by `kind`. */
  amountCents: number;
  kind: ImportRowKind;
};

/** The fields a format's row parser produces; the generic parser adds formatId and rowNumber. */
export type ImportCsvRowFields = Omit<ImportCsvRow, "formatId" | "rowNumber">;

export type FormatRowResult =
  | { success: true; data: ImportCsvRowFields }
  | { success: false; errors: string[] };

export type ImportFormat = {
  /** Stored in the database, so it must never change once data exists. */
  id: ImportFormatId;
  label: string;
  /** The exact header columns the bank exports. Order is ignored, names are case-sensitive. */
  columns: string[];
  parseRow: (csvRow: Record<string, string>) => FormatRowResult;
};

export type FormatDetection =
  | { success: true; format: ImportFormat }
  | { success: false; error: string };

export type ImportParseResult =
  | { success: true; formatId: ImportFormatId; formatLabel: string; rows: ImportCsvRow[] }
  | { success: false; errors: string[] };

/** The minimum needed to decide whether a row was already imported. */
export type RowIdentity = {
  rowHash: string;
  last4: string;
  transactionDate: string;
  amountCents: number;
};

export type DuplicateCheckedRow = {
  rowHash: string;
  /** 1-based count of rows with this hash so far in the file; marker design will need it. */
  occurrence: number;
  isDuplicate: boolean;
  /** Set when a new row matches an existing row's card, amount and date but not its hash. */
  possibleDuplicateOfHash: string | null;
};
