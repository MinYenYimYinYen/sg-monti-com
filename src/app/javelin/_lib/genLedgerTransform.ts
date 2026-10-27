import Papa from "papaparse";
import { GenLedgerAccountEntry, GenLedgerFile, GenLedgerRow } from "@/app/javelin/JavelinTypes";

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

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Splits rows into those that carry a real ledger amount and those whose debits and credits
 * cancel out (net $0.00 after rounding to cents). A zero-net account has no ledger line, and
 * QB rejects an import row with neither a debit nor a credit.
 */
export function splitZeroNetRows(rows: GenLedgerRow[]): {
  postingRows: GenLedgerRow[];
  zeroNetRows: GenLedgerRow[];
} {
  const postingRows = rows.filter((row) => toCents(row.totalNetAmount) !== 0);
  const zeroNetRows = rows.filter((row) => toCents(row.totalNetAmount) === 0);
  return { postingRows, zeroNetRows };
}

/**
 * Converts parsed GL files into a QB Online journal entry import CSV string.
 * JournalNo and JournalDate are repeated on every row of each journal entry group.
 */
export function transformToQBJournalCSV(
  files: GenLedgerFile[],
  accountMap: Record<string, GenLedgerAccountEntry>,
  journalNoPrefix: string,
): string {
  const outputRows: QBJournalRow[] = [];

  // Files with nothing to post are dropped before numbering so journal numbers stay sequential.
  const filesWithPostings = files
    .map((file) => ({ file, postingRows: splitZeroNetRows(file.rows).postingRows }))
    .filter(({ postingRows }) => postingRows.length > 0);

  filesWithPostings.forEach(({ file, postingRows }, fileIndex) => {
    const journalNo = `${journalNoPrefix}${String(fileIndex + 1).padStart(2, "0")}`;
    const journalDate = formatQBDate(file.date);

    postingRows.forEach((row) => {
      const cents = toCents(row.totalNetAmount);
      const entry = accountMap[row.account];
      const autoAccountNumber = row.account.split(" - ")[0].trim();
      const accountNumber = entry?.accountNumber ?? autoAccountNumber;
      const qbName = entry?.qbName ?? row.account;
      outputRows.push({
        "*JournalNo": journalNo,
        "*JournalDate": journalDate,
        // Prepend account number to QB name — QBO accepts "102.2 SA Payments:Credit Card Payments"
        "*AccountName": `${accountNumber} ${qbName}`,
        "*Debits": cents > 0 ? cents / 100 : "",
        "*Credits": cents < 0 ? Math.abs(cents) / 100 : "",
        "Name": entry?.name ?? "",
      });
    });
  });

  return Papa.unparse(outputRows, {
    columns: ["*JournalNo", "*JournalDate", "*AccountName", "*Debits", "*Credits", "Name"],
  });
}

/**
 * Triggers a browser file download for the given CSV string.
 */
export function triggerCSVDownload(csvString: string, fileName: string): void {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
