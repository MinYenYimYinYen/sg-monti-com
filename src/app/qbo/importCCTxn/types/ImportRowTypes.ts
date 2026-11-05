import { ImportCsvRow, ImportFormatId } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import { ImportSkipReason } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";

export type ImportRowStatus = "pending" | "skipped" | "posting" | "posted" | "failed" | "unknown";

/**
 * `payment` and `refund` are automatic and permanent. `duplicate` is a possible duplicate the
 * user confirmed at import. The rest are chosen by a person or a merchant rule.
 */
export type ImportRowSkipReason = "payment" | "refund" | "duplicate" | ImportSkipReason;

/** Skip reasons a person may set or clear on a row after import. */
export const MANUAL_SKIP_REASONS: ImportRowSkipReason[] = ["inventoryPurchase", "duplicate"];

/**
 * One persisted CSV row. Natural key: rowId. Every row from a file is kept, skipped ones
 * included, so a transaction that appears in a CSV is always logged.
 */
export type ImportRow = Omit<ImportCsvRow, "rowNumber"> & {
  /** `${rowHash}:${occurrence}`. The hash already includes formatId. */
  rowId: string;
  rowHash: string;
  /** 1-based count of rows with this hash within the file that first held it. */
  occurrence: number;
  merchantKey: string;
  status: ImportRowStatus;
  skipReason?: ImportRowSkipReason;
  /** Set when the row matched a stored row's card, amount and date but not its hash. */
  possibleDuplicateOfHash?: string;
  importBatchId: string;
  fileName: string;
  importedByUserName: string;
  /** The Ref no. sent to QuickBooks. Set when posting starts, so a retry resends the same one. */
  docNumber?: string;
  /** The QuickBooks Purchase Id, once the purchase is known to exist. */
  qboPurchaseId?: string;
  postedAt?: string;
  postedByUserName?: string;
  /** Why the last post failed or is unknown, or what reconciliation found. */
  postMessage?: string;
};

/** What a post would send, for the confirmation dialog. Null when the row cannot be posted. */
export type PostPreviewSummary = {
  vendorName: string;
  expenseAccountName: string;
  cardAccountName: string;
  transactionDate: string;
  amountCents: number;
  docNumber: string;
};

export type PostPreview = {
  rowId: string;
  problems: string[];
  warnings: string[];
  summary: PostPreviewSummary | null;
};

/** `posted` and `failed` are certain; `unknown` needs reconciling before any retry. */
export type PostOutcome = "posted" | "failed" | "unknown" | "pending";

export type PostResult = {
  row: ImportRow;
  outcome: PostOutcome;
};

export type PossibleDuplicate = {
  rowNumber: number;
  transactionDate: string;
  description: string;
  amountCents: number;
};

/** What an import would do, computed without writing anything. */
export type ImportPreview = {
  formatId: ImportFormatId;
  newCount: number;
  duplicateCount: number;
  /** New rows that will be stored as skipped, by reason. */
  skippedCounts: Partial<Record<ImportRowSkipReason, number>>;
  possibleDuplicates: PossibleDuplicate[];
  /** Cards in the file with no responsible user yet. A commit is refused until this is empty. */
  unassignedLast4s: string[];
};

export type ImportCommitResult = {
  importBatchId: string;
  /** The rows that were stored. Rows already imported are not stored again. */
  insertedRows: ImportRow[];
  duplicateCount: number;
};
