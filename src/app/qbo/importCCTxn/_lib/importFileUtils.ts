import { ImportCsvRow, ImportFormatId } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import { CardAssignment } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRowSkipReason } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { cardAssignmentKey } from "@/app/qbo/importCCTxn/_lib/importMappingUtils";

// Pure helpers for showing a parsed file. Selectors and components call these.

export type FileCard = {
  formatId: ImportFormatId;
  last4: string;
  rowCount: number;
};

export type FileSummary = {
  rowCount: number;
  chargeCount: number;
  chargeTotalCents: number;
  /** Payments and refunds, which are never posted. */
  nonChargeCount: number;
  minTransactionDate: string;
  maxTransactionDate: string;
};

export const skipReasonLabels: Record<ImportRowSkipReason, string> = {
  payment: "Payments",
  refund: "Refunds",
  duplicate: "Duplicates left out",
  inventoryPurchase: "Inventory purchases",
};

export function summarizeFileCards(rows: ImportCsvRow[]): FileCard[] {
  const cardsByLast4 = new Map<string, FileCard>();
  for (const row of rows) {
    const existing = cardsByLast4.get(row.last4);
    if (existing) existing.rowCount += 1;
    else cardsByLast4.set(row.last4, { formatId: row.formatId, last4: row.last4, rowCount: 1 });
  }
  return [...cardsByLast4.values()].sort((a, b) => a.last4.localeCompare(b.last4));
}

export function findUnassignedCards({
  fileCards,
  cardAssignmentMap,
}: {
  fileCards: FileCard[];
  cardAssignmentMap: Map<string, CardAssignment>;
}): FileCard[] {
  return fileCards.filter((card) => !cardAssignmentMap.has(cardAssignmentKey(card)));
}

export function summarizeFile(rows: ImportCsvRow[]): FileSummary | null {
  if (rows.length === 0) return null;

  const charges = rows.filter((row) => row.kind === "charge");
  const dates = rows.map((row) => row.transactionDate).sort();
  return {
    rowCount: rows.length,
    chargeCount: charges.length,
    chargeTotalCents: charges.reduce((total, row) => total + row.amountCents, 0),
    nonChargeCount: rows.length - charges.length,
    minTransactionDate: dates[0],
    maxTransactionDate: dates[dates.length - 1],
  };
}

const currencyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return currencyFormat.format(cents / 100);
}
