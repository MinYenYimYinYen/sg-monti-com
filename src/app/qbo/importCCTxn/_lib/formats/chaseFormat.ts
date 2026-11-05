import {
  FormatRowResult,
  ImportFormat,
  ImportRowKind,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import {
  collapseWhitespace,
  parseLast4,
  parseMoneyToCents,
  parseUsDateToIso,
} from "@/app/qbo/importCCTxn/_lib/importCsvValues";

// Chase writes charges as negative amounts. The Memo column is ignored on purpose.
const CHASE_COLUMNS = [
  "Card",
  "Transaction Date",
  "Post Date",
  "Description",
  "Category",
  "Type",
  "Amount",
  "Memo",
];

function kindFromChaseType(type: string): ImportRowKind | null {
  if (type === "Sale") return "charge";
  if (type === "Payment") return "payment";
  if (type === "Return") return "refund";
  return null;
}

function parseChaseRow(csvRow: Record<string, string>): FormatRowResult {
  const errors: string[] = [];

  const rawCard = csvRow["Card"] ?? "";
  const last4 = parseLast4(rawCard);
  if (!last4) errors.push(`Card "${rawCard}" is not a 4-digit card number`);

  const rawTransactionDate = csvRow["Transaction Date"] ?? "";
  const transactionDate = parseUsDateToIso(rawTransactionDate);
  if (!transactionDate) errors.push(`Transaction Date "${rawTransactionDate}" is not a valid MM/DD/YYYY date`);

  const rawPostDate = csvRow["Post Date"] ?? "";
  const postedDate = parseUsDateToIso(rawPostDate);
  if (!postedDate) errors.push(`Post Date "${rawPostDate}" is not a valid MM/DD/YYYY date`);

  const description = collapseWhitespace(csvRow["Description"] ?? "");
  if (!description) errors.push("Description is empty");

  const rawAmount = csvRow["Amount"] ?? "";
  const amount = parseMoneyToCents(rawAmount);
  if (amount === null) errors.push(`Amount "${rawAmount}" is not a valid amount`);
  else if (amount === 0) errors.push("Amount is zero");

  const type = (csvRow["Type"] ?? "").trim();
  const kind = kindFromChaseType(type);
  if (!kind) errors.push(`Unknown Type "${type}" (expected Sale, Payment or Return)`);

  if (kind === "charge" && amount !== null && amount > 0) {
    errors.push(`Sale has a positive amount (${rawAmount}); expected a negative amount`);
  }

  if (errors.length > 0 || !last4 || !transactionDate || !postedDate || amount === null || !kind) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      transactionDate,
      postedDate,
      last4,
      description,
      category: collapseWhitespace(csvRow["Category"] ?? ""),
      amountCents: Math.abs(amount),
      kind,
    },
  };
}

export const chaseFormat: ImportFormat = {
  id: "chase",
  label: "Chase",
  columns: CHASE_COLUMNS,
  parseRow: parseChaseRow,
};
