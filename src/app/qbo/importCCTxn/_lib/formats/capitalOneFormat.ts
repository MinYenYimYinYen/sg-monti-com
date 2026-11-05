import {
  FormatRowResult,
  ImportFormat,
  ImportRowKind,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import {
  collapseWhitespace,
  parseIsoDate,
  parseLast4,
  parseMoneyToCents,
} from "@/app/qbo/importCCTxn/_lib/importCsvValues";

// Capital One writes dates as YYYY-MM-DD (found when the first real export was imported; the
// original sample file had US-style dates and was wrong). Chase writes MM/DD/YYYY.
const CAPITAL_ONE_COLUMNS = [
  "Transaction Date",
  "Posted Date",
  "Card No.",
  "Description",
  "Category",
  "Debit",
  "Credit",
];

// A credit categorized this way is a payment toward the card. UNVERIFIED against more samples:
// any other credit is treated as a refund, which is skipped either way.
const PAYMENT_CATEGORY = "Payment/Credit";

function parseCapitalOneRow(csvRow: Record<string, string>): FormatRowResult {
  const errors: string[] = [];

  const rawCard = csvRow["Card No."] ?? "";
  const last4 = parseLast4(rawCard);
  if (!last4) errors.push(`Card No. "${rawCard}" is not a 4-digit card number`);

  const rawTransactionDate = csvRow["Transaction Date"] ?? "";
  const transactionDate = parseIsoDate(rawTransactionDate);
  if (!transactionDate) errors.push(`Transaction Date "${rawTransactionDate}" is not a valid YYYY-MM-DD date`);

  const rawPostedDate = csvRow["Posted Date"] ?? "";
  const postedDate = parseIsoDate(rawPostedDate);
  if (!postedDate) errors.push(`Posted Date "${rawPostedDate}" is not a valid YYYY-MM-DD date`);

  const description = collapseWhitespace(csvRow["Description"] ?? "");
  if (!description) errors.push("Description is empty");

  const category = collapseWhitespace(csvRow["Category"] ?? "");

  const rawDebit = (csvRow["Debit"] ?? "").trim();
  const rawCredit = (csvRow["Credit"] ?? "").trim();
  let amountCents: number | null = null;
  let kind: ImportRowKind | null = null;

  if (rawDebit && rawCredit) {
    errors.push("Both Debit and Credit have a value; expected exactly one");
  } else if (!rawDebit && !rawCredit) {
    errors.push("Neither Debit nor Credit has a value; expected exactly one");
  } else {
    const rawAmount = rawDebit || rawCredit;
    const amount = parseMoneyToCents(rawAmount);
    if (amount === null) errors.push(`Amount "${rawAmount}" is not a valid amount`);
    else if (amount <= 0) errors.push(`Amount "${rawAmount}" must be greater than zero`);
    else {
      amountCents = amount;
      if (rawDebit) kind = "charge";
      else kind = category === PAYMENT_CATEGORY ? "payment" : "refund";
    }
  }

  if (errors.length > 0 || !last4 || !transactionDate || !postedDate || amountCents === null || !kind) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { transactionDate, postedDate, last4, description, category, amountCents, kind },
  };
}

export const capitalOneFormat: ImportFormat = {
  id: "capitalOne",
  label: "Capital One",
  columns: CAPITAL_ONE_COLUMNS,
  parseRow: parseCapitalOneRow,
};
