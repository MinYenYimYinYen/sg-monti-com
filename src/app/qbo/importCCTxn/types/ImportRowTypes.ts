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
  /**
   * The expense account chosen for this row alone. Absent means the merchant's default account.
   * Never repeats the default: picking the default clears it.
   */
  accountId?: string;
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

/** A row that was not sent to QuickBooks, with why. Nothing was written for it. */
export type BlockedRow = {
  rowId: string;
  description: string;
  transactionDate: string;
  amountCents: number;
  problems: string[];
};

/**
 * What one posting request did. `results` are the rows that were sent and settled. `blockedRows`
 * failed the pre-flight at post time or were taken by someone else, so they were not sent.
 * `notAttemptedRowIds` were not sent because the run stopped after a batch where not every row
 * posted, and `stopReason` says why. All of these rows are still where they were.
 */
export type PostRowsResult = {
  results: PostResult[];
  blockedRows: BlockedRow[];
  notAttemptedRowIds: string[];
  stopReason: string | null;
};

export type BatchPreviewMessage = {
  message: string;
  count: number;
};

/**
 * What posting a date range would send, computed without writing anything. `readyRowIds` is
 * exactly what the confirmation posts, so what the user sees is what is sent.
 */
export type BatchPreview = {
  startDate: string;
  endDate: string;
  readyRowIds: string[];
  readyCount: number;
  readyTotalCents: number;
  /** Ready rows over the per-request cap. They stay pending; post again after this run. */
  deferredCount: number;
  /** QuickBooks batch requests this run will make. */
  batchCount: number;
  /** Ready rows whose description nobody has confirmed against the vendor. Never blocks. */
  unconfirmedCount: number;
  warnings: BatchPreviewMessage[];
  blockedRows: BlockedRow[];
  /** Rows anywhere that are unknown or stuck posting. They are not in this run. */
  unsettledRowCount: number;
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
