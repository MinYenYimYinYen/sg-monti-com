import { parseIsoDate } from "@/app/qbo/journalEntry/_lib/qboJournalEntryUtils";
import { DEPOSIT_FIELDS } from "@/app/javelin/_lib/depositFields";
import { nextIsoDate } from "@/app/javelin/_lib/latestUtils";

// Pure. The browser sends parsed CSV data as JSON, so its shape is checked at runtime. The server
// trusts nothing it can recompute, but it cannot recompute a malformed payload.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Returns every problem found. An empty list means the payload is safe to build entries from. */
export function validateGenLedgerFiles(files: unknown): string[] {
  if (!Array.isArray(files) || files.length === 0) return ["Choose at least one file."];
  const problems: string[] = [];
  files.forEach((file: unknown, fileIndex) => {
    const where = `File ${fileIndex + 1}`;
    if (!isRecord(file)) {
      problems.push(`${where}: is not valid.`);
      return;
    }
    if (typeof file.fileName !== "string" || file.fileName.length === 0) {
      problems.push(`${where}: has no file name.`);
    }
    if (typeof file.date !== "string" || parseIsoDate(file.date) === null) {
      problems.push(`${where}: the date must be a real date written YYYY-MM-DD.`);
    }
    if (!Array.isArray(file.rows)) {
      problems.push(`${where}: has no rows.`);
      return;
    }
    file.rows.forEach((row: unknown, rowIndex) => {
      if (
        !isRecord(row) ||
        typeof row.account !== "string" ||
        row.account.trim().length === 0 ||
        typeof row.totalNetAmount !== "number" ||
        !Number.isFinite(row.totalNetAmount)
      ) {
        problems.push(`${where}, row ${rowIndex + 1}: needs an account and an amount.`);
      }
    });
  });
  return problems;
}

export function validateDepositRows(rows: unknown): string[] {
  if (!Array.isArray(rows) || rows.length === 0) return ["The deposit file has no rows."];
  const problems: string[] = [];
  rows.forEach((row: unknown, rowIndex) => {
    const where = `Row ${rowIndex + 1}`;
    if (!isRecord(row)) {
      problems.push(`${where}: is not valid.`);
      return;
    }
    if (typeof row.date !== "string" || parseIsoDate(row.date) === null) {
      problems.push(`${where}: the date must be a real date written YYYY-MM-DD.`);
    }
    for (const field of DEPOSIT_FIELDS) {
      const value = row[field];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        problems.push(`${where}: ${field} must be a number.`);
      }
    }
  });
  return problems;
}

const MAX_CK_DEPOSIT_ROWS = 200;
const MAX_CK_DEPOSIT_AMOUNT = 1_000_000_000;

/**
 * A typed-in deposit has no file to cross-check, so the checks are tight: a real date no more than
 * a day after today (the day absorbs time zones), and an amount above zero in whole cents.
 */
export function validateCkDepositRows({
  rows,
  todayIso,
}: {
  rows: unknown;
  todayIso: string;
}): string[] {
  if (!Array.isArray(rows) || rows.length === 0) return ["Enter at least one deposit."];
  if (rows.length > MAX_CK_DEPOSIT_ROWS) {
    return [`Enter at most ${MAX_CK_DEPOSIT_ROWS} deposits at a time.`];
  }
  const latestDate = nextIsoDate(todayIso);
  const problems: string[] = [];
  rows.forEach((row: unknown, rowIndex) => {
    const where = `Row ${rowIndex + 1}`;
    if (!isRecord(row)) {
      problems.push(`${where}: is not valid.`);
      return;
    }
    if (typeof row.date !== "string" || parseIsoDate(row.date) === null) {
      problems.push(`${where}: the date must be a real date written YYYY-MM-DD.`);
    } else if (row.date > latestDate) {
      problems.push(`${where}: the date is in the future.`);
    }
    const amount = row.amount;
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount >= MAX_CK_DEPOSIT_AMOUNT ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
    ) {
      problems.push(`${where}: the amount must be above zero, in dollars and cents.`);
    }
  });
  return problems;
}

export function validateConfirmedDocNumbers(confirmed: unknown): string[] {
  if (!Array.isArray(confirmed) || confirmed.some((docNumber) => typeof docNumber !== "string")) {
    return ["The confirmed entries are not valid."];
  }
  return [];
}
