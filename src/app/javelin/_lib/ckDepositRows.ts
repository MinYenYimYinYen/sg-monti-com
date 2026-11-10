import { CkDepositDraftRow, CkDepositRow } from "@/app/javelin/JavelinTypes";
import { toCents } from "@/app/javelin/_lib/genLedgerRows";

// Pure. The rows as the user types them, and what is sent from them.

export function blankDraftRow(): CkDepositDraftRow {
  return { date: "", amount: "" };
}

/** The amount as a number, or null when it is empty, not a number, or not above zero. */
export function parseDraftAmount(text: string): number | null {
  if (text.trim() === "") return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export type DraftSummary = {
  /** Rows that have both a date and a usable amount. */
  rows: CkDepositRow[];
  /** Rows with only one of the two, or an unusable amount. They block checking. */
  incompleteCount: number;
  totalCents: number;
};

/** Rows left completely blank are ignored, so the spare row at the end never gets in the way. */
export function summarizeDraftRows(draftRows: CkDepositDraftRow[]): DraftSummary {
  const rows: CkDepositRow[] = [];
  let incompleteCount = 0;
  for (const draft of draftRows) {
    if (draft.date === "" && draft.amount.trim() === "") continue;
    const amount = parseDraftAmount(draft.amount);
    if (draft.date === "" || amount === null) {
      incompleteCount += 1;
      continue;
    }
    rows.push({ date: draft.date, amount });
  }
  return {
    rows,
    incompleteCount,
    totalCents: rows.reduce((total, row) => total + toCents(row.amount), 0),
  };
}

/**
 * Takes away one row for each entry that posted, matched on date and total. Posted rows must not
 * stay: checking them again would number them as second deposits and call them possible
 * duplicates. Rows that did not post stay, so they can be corrected and sent again.
 */
export function removePostedRows({
  rows,
  posted,
}: {
  rows: CkDepositDraftRow[];
  posted: { txnDate: string; totalCents: number }[];
}): CkDepositDraftRow[] {
  const remaining = [...rows];
  for (const entry of posted) {
    const index = remaining.findIndex((row) => {
      const amount = parseDraftAmount(row.amount);
      return row.date === entry.txnDate && amount !== null && toCents(amount) === entry.totalCents;
    });
    if (index >= 0) remaining.splice(index, 1);
  }
  return remaining.length > 0 ? remaining : [blankDraftRow()];
}
