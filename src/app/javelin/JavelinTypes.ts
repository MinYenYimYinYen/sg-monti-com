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

/** Per-account mapping stored in GlobalSettings and the Javelin slice. */
export type GenLedgerAccountEntry = {
  qbName: string;
  /** Optional QB Name column value — customer/vendor name for this account line. */
  name?: string;
  /** Optional QB AccountNo column value — auto-parsed from CRM account name, overridable. */
  accountNumber?: string;
};

export type JavelinState = {
  files: GenLedgerFile[];
  journalNoPrefix: string;
  savedAccountMap: Record<string, GenLedgerAccountEntry>;
  liveAccountMap: Record<string, GenLedgerAccountEntry>;
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

/** Per-field QB account mapping for deposits. Mirrors GenLedgerAccountEntry. */
export type DepositAccountEntry = {
  qbName: string;
  /** Optional account number prepended to qbName in the output CSV. */
  accountNumber?: string;
  /** Optional vendor/customer name for the QB Name column. */
  name?: string;
};

/** QB account entry per deposit field. */
export type DepositAccountMap = Record<DepositField, DepositAccountEntry>;

export type DepositState = {
  rows: DepositRow[];
  fileName: string;
  warnings: string[];
  errors: string[];
  journalNoPrefix: string;
  savedAccountMap: DepositAccountMap;
  liveAccountMap: DepositAccountMap;
};
