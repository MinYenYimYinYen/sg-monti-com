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
