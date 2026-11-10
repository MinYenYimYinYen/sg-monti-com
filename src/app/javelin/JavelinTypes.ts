import {
  JournalEntryPostingLine,
  PostJournalEntriesResult,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";

export type GenLedgerRow = {
  account: string;
  totalNetAmount: number;
};

export type GenLedgerFile = {
  fileName: string;
  date: string;
  rows: GenLedgerRow[];
  warnings: string[];
  errors: string[];
};

/**
 * LEGACY. The old CSV-era mapping of a CRM account name to a QuickBooks account name, still held
 * in GlobalSettings only so the mapping migration can read it. New code maps by QBO Id (see
 * src/app/account). Remove with GlobalSettings.genLedgerAccountMap once the migration is verified.
 */
export type GenLedgerAccountEntry = {
  qbName: string;
  /** Optional QB Name column value: customer/vendor name for this account line. */
  name?: string;
  /** Optional QB AccountNo column value: auto-parsed from CRM account name, overridable. */
  accountNumber?: string;
};

/** What the browser sends for one day's ledger. The server derives everything else from it. */
export type GenLedgerFileInput = Pick<GenLedgerFile, "fileName" | "date" | "rows">;

/**
 * - ready: will be posted.
 * - duplicate: this exact source is already posted (or being posted), so it is never sent again.
 * - possibleDuplicate: different content, but the same kind and date (and net deposit, for a
 *   deposit) as an entry already posted. Posts only when the user confirms it.
 * - blocked: cannot be posted until the problems are fixed (unmapped account, out of balance...).
 * - empty: nothing to post (every line nets to zero).
 */
export type JavelinPlanStatus = "ready" | "duplicate" | "possibleDuplicate" | "blocked" | "empty";

/** What posting one file or deposit row would do, computed on the server without writing anything. */
export type JavelinPlanEntry = {
  label: string;
  txnDate: string;
  docNumber: string | null;
  status: JavelinPlanStatus;
  problems: string[];
  /** The stored entry this one duplicates or resembles. */
  matchedDocNumber?: string;
  lines: JournalEntryPostingLine[];
  totalCents: number;
  netDepositCents?: number;
};

export type JavelinLatestEntry = {
  txnDate: string;
  docNumber: string;
  /** Credit card deposits only: what hit the bank. */
  netDepositCents?: number;
  /** Check deposits only: the deposit total. */
  amountCents?: number;
};

/** What was last posted, so the user knows which CSV data to export next. */
export type JavelinLatest = {
  genLedger: JavelinLatestEntry | null;
  deposit: JavelinLatestEntry | null;
  ckDeposit: JavelinLatestEntry | null;
  /** Entries whose outcome is unconfirmed. The dates above cannot be fully trusted until they are settled. */
  unsettledDocNumbers: string[];
};

export type JavelinKind = "genLedger" | "deposit" | "ckDeposit";

export type JavelinState = {
  files: GenLedgerFile[];
  /** Possible duplicates the user chose to post anyway. Cleared when new files are dropped. */
  confirmedDocNumbers: string[];
  plan: JavelinPlanEntry[];
  lastRun: PostJournalEntriesResult | null;
  latest: JavelinLatest | null;
};

// ─── Deposit Types ────────────────────────────────────────────────────────────

/** The 6 deposit fields that appear as journal entry lines (GrossDepositAmount excluded). */
export type DepositField =
  | "salesAmount"
  | "refundAmount"
  | "chargeBackAmount"
  | "adjustmentAmount"
  | "fees"
  | "netDeposit";

/** One parsed row from the deposit CSV. Date is already adjusted (DepositDate − 1 day). */
export type DepositRow = {
  date: string;               // ISO yyyy-MM-dd
  salesAmount: number;
  refundAmount: number;
  chargeBackAmount: number;
  adjustmentAmount: number;
  grossDepositAmount: number; // parsed but never output — it's a subtotal
  fees: number;
  netDeposit: number;
};

/** LEGACY per-field QB account mapping for deposits. See GenLedgerAccountEntry. */
export type DepositAccountEntry = {
  qbName: string;
  accountNumber?: string;
  name?: string;
};

/** LEGACY. QB account entry per deposit field, kept in GlobalSettings for the migration only. */
export type DepositAccountMap = Record<DepositField, DepositAccountEntry>;

export const emptyDepositAccountMap: DepositAccountMap = {
  salesAmount: { qbName: "" },
  refundAmount: { qbName: "" },
  chargeBackAmount: { qbName: "" },
  adjustmentAmount: { qbName: "" },
  fees: { qbName: "" },
  netDeposit: { qbName: "" },
};

export type DepositState = {
  rows: DepositRow[];
  fileName: string;
  warnings: string[];
  errors: string[];
  confirmedDocNumbers: string[];
  plan: JavelinPlanEntry[];
  lastRun: PostJournalEntriesResult | null;
};

// ─── Check Deposit Types ──────────────────────────────────────────────────────

/**
 * The two accounts a check deposit moves money between. They are not WorkWave export columns, so
 * they are kept apart from DepositField: the CSV parser, hash and validation never see them.
 */
export type CkDepositLinkKey = "ckDepositAccount" | "ckHoldingAccount";

/** Every key a deposit link can be stored under. */
export type DepositLinkKey = DepositField | CkDepositLinkKey;

/** What the browser sends for one checking deposit. */
export type CkDepositRow = {
  date: string; // ISO yyyy-MM-dd
  amount: number;
};

/** A row as typed: the amount stays text so a half-typed number is not rewritten. */
export type CkDepositDraftRow = {
  date: string;
  amount: string;
};

export type CkDepositState = {
  rows: CkDepositDraftRow[];
  confirmedDocNumbers: string[];
  plan: JavelinPlanEntry[];
  lastRun: PostJournalEntriesResult | null;
};
