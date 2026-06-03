import Papa from "papaparse";
import { DepositAccountEntry, DepositAccountMap, DepositField, DepositRow } from "@/app/javelin/JavelinTypes";
import { triggerCSVDownload } from "@/app/javelin/_lib/genLedgerTransform";

// Natural side for each field when value is positive.
// "credit" means the value goes in the Credits column; "debit" means Debits.
export const FIELD_NATURAL_SIDE: Record<DepositField, "debit" | "credit"> = {
  salesAmount: "credit",
  refundAmount: "debit",
  chargeBackAmount: "debit",
  adjustmentAmount: "debit",
  fees: "debit",
  netDeposit: "debit",
};

export const DEPOSIT_FIELDS: DepositField[] = [
  "salesAmount",
  "refundAmount",
  "chargeBackAmount",
  "adjustmentAmount",
  "fees",
  "netDeposit",
];

type QBJournalRow = {
  "*JournalNo": string;
  "*JournalDate": string;
  "*AccountName": string;
  "*Debits": number | string;
  "*Credits": number | string;
  "Name": string;
};

function formatQBDate(isoDate: string): string {
  // Parse as local date to avoid UTC offset shifting the day
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${month}/${day}/${year}`;
}

/**
 * Converts parsed deposit rows into a QB Online journal entry import CSV string.
 * Each input row becomes one multi-line journal entry. Zero-value fields are excluded.
 * If a field value is negative, its natural debit/credit side is flipped.
 */
export function transformToDepositCSV(
  rows: DepositRow[],
  accountMap: DepositAccountMap,
  journalNoPrefix: string,
): string {
  const outputRows: QBJournalRow[] = [];
  // suppress unused import warning — DepositAccountEntry is used in the type annotation below
  void (0 as unknown as DepositAccountEntry);

  rows.forEach((row, rowIndex) => {
    const journalNo = `${journalNoPrefix}${String(rowIndex + 1).padStart(2, "0")}`;
    const journalDate = formatQBDate(row.date);

    for (const field of DEPOSIT_FIELDS) {
      const value = row[field];
      if (value === 0) continue;

      const naturalSide = FIELD_NATURAL_SIDE[field];
      const absValue = Math.abs(value);
      const isPositive = value > 0;

      // If positive: use natural side. If negative: flip side.
      const effectiveSide =
        isPositive
          ? naturalSide
          : naturalSide === "debit" ? "credit" : "debit";

      const entry = accountMap[field];
      const accountNumber = entry.accountNumber ?? "";
      const accountName = accountNumber
        ? `${accountNumber} ${entry.qbName}`
        : entry.qbName;

      outputRows.push({
        "*JournalNo": journalNo,
        "*JournalDate": journalDate,
        "*AccountName": accountName,
        "*Debits": effectiveSide === "debit" ? absValue : "",
        "*Credits": effectiveSide === "credit" ? absValue : "",
        "Name": entry.name ?? "",
      });
    }
  });

  return Papa.unparse(outputRows, {
    columns: ["*JournalNo", "*JournalDate", "*AccountName", "*Debits", "*Credits", "Name"],
  });
}

export { triggerCSVDownload };
