import Papa from "papaparse";
import { GenLedgerAccountEntry, GenLedgerFile } from "@/app/javelin/JavelinTypes";

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
 * Converts parsed GL files into a QB Online journal entry import CSV string.
 * JournalNo and JournalDate are repeated on every row of each journal entry group.
 */
export function transformToQBJournalCSV(
  files: GenLedgerFile[],
  accountMap: Record<string, GenLedgerAccountEntry>,
  journalNoPrefix: string,
): string {
  const outputRows: QBJournalRow[] = [];

  files.forEach((file, fileIndex) => {
    const journalNo = `${journalNoPrefix}${String(fileIndex + 1).padStart(2, "0")}`;
    const journalDate = formatQBDate(file.date);

    file.rows.forEach((row) => {
      const entry = accountMap[row.account];
      const autoAccountNumber = row.account.split(" - ")[0].trim();
      const accountNumber = entry?.accountNumber ?? autoAccountNumber;
      const qbName = entry?.qbName ?? row.account;
      outputRows.push({
        "*JournalNo": journalNo,
        "*JournalDate": journalDate,
        // Prepend account number to QB name — QBO accepts "102.2 SA Payments:Credit Card Payments"
        "*AccountName": `${accountNumber} ${qbName}`,
        "*Debits": row.totalNetAmount > 0 ? row.totalNetAmount : "",
        "*Credits": row.totalNetAmount < 0 ? Math.abs(row.totalNetAmount) : "",
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
