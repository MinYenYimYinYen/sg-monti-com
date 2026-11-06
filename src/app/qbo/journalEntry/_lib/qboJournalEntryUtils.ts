import {
  JournalEntryInput,
  JournalEntryRange,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";

// Pure validation helpers for journal entries, free of fetch and the database so they can be
// tested. All arithmetic is in whole cents, so a sum can never drift out of balance.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// DocNumber goes into Intuit's query text, so only characters that cannot break a quoted string
// are allowed. Stricter than QuickBooks itself, on purpose.
const DOC_NUMBER_PATTERN = /^[A-Za-z0-9._-]+$/;

export function centsToDollars(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/** Milliseconds at UTC midnight for a real YYYY-MM-DD date, or null for anything else (such as 2026-02-31). */
export function parseIsoDate(value: string): number | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  const isRealDate =
    check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
  return isRealDate ? ms : null;
}

/** A message for the user, or null when the range is real, in order and not too wide. */
export function validateJournalEntryRange({
  range,
  maxDays,
}: {
  range: JournalEntryRange;
  maxDays: number;
}): string | null {
  const start = typeof range.startDate === "string" ? parseIsoDate(range.startDate) : null;
  const end = typeof range.endDate === "string" ? parseIsoDate(range.endDate) : null;
  if (start === null || end === null) return "Enter a start and end date.";
  if (start > end) return "The start date must be on or before the end date.";
  const days = Math.round((end - start) / MS_PER_DAY) + 1;
  if (days > maxDays) return `Choose a range of at most ${maxDays} days.`;
  return null;
}

/** Sums of each side in cents. Lines with a bad posting type or amount are left out; validation reports them. */
export function sumSides(lines: JournalEntryInput["lines"]): {
  debitCents: number;
  creditCents: number;
} {
  let debitCents = 0;
  let creditCents = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line.amountCents)) continue;
    if (line.postingType === "Debit") debitCents += line.amountCents;
    if (line.postingType === "Credit") creditCents += line.amountCents;
  }
  return { debitCents, creditCents };
}

/** True for a string made only of characters that are safe inside Intuit's quoted query text. */
export function isSafeDocNumber(docNumber: unknown): docNumber is string {
  return typeof docNumber === "string" && DOC_NUMBER_PATTERN.test(docNumber);
}

function validateDocNumber({
  docNumber,
  maxLength,
}: {
  docNumber: unknown;
  maxLength: number;
}): string | null {
  if (typeof docNumber !== "string" || docNumber.length === 0) return "A DocNumber is required.";
  if (!DOC_NUMBER_PATTERN.test(docNumber)) {
    return "The DocNumber may only use letters, digits, dots, dashes and underscores.";
  }
  if (docNumber.length > maxLength) return `The DocNumber may be at most ${maxLength} characters.`;
  return null;
}

function validateLine({
  line,
  label,
}: {
  line: JournalEntryInput["lines"][number];
  label: string;
}): string[] {
  const problems: string[] = [];
  if (typeof line !== "object" || line === null) return [`${label}: the line is not valid.`];
  if (line.description !== undefined && typeof line.description !== "string") {
    problems.push(`${label}: the description must be text.`);
  }
  if (line.postingType !== "Debit" && line.postingType !== "Credit") {
    problems.push(`${label}: choose Debit or Credit.`);
  }
  if (typeof line.accountId !== "string" || line.accountId.length === 0) {
    problems.push(`${label}: choose an account.`);
  }
  if (!Number.isSafeInteger(line.amountCents) || line.amountCents <= 0) {
    problems.push(`${label}: the amount must be a positive whole number of cents.`);
  }
  const hasType = line.entityType !== undefined;
  const hasId = line.entityId !== undefined && line.entityId.length > 0;
  if (hasType !== hasId) {
    problems.push(`${label}: give both the name type and the name, or neither.`);
  }
  if (hasType && line.entityType !== "Customer" && line.entityType !== "Vendor") {
    problems.push(`${label}: the name must be a Customer or a Vendor.`);
  }
  return problems;
}

/**
 * Everything wrong with an entry that can be seen without QuickBooks. An empty list means the
 * entry is well formed and balanced. The caller's data arrives as JSON, so types are checked at
 * runtime too.
 */
export function validateJournalEntryInput({
  entry,
  docNumberMaxLength,
}: {
  entry: JournalEntryInput;
  docNumberMaxLength: number;
}): string[] {
  const problems: string[] = [];

  const docNumberProblem = validateDocNumber({
    docNumber: entry.docNumber,
    maxLength: docNumberMaxLength,
  });
  if (docNumberProblem) problems.push(docNumberProblem);

  if (typeof entry.txnDate !== "string" || parseIsoDate(entry.txnDate) === null) {
    problems.push("The date must be a real date written YYYY-MM-DD.");
  }

  if (entry.privateNote !== undefined && typeof entry.privateNote !== "string") {
    problems.push("The note must be text.");
  }

  if (!Array.isArray(entry.lines) || entry.lines.length < 2) {
    problems.push("An entry needs at least one debit line and one credit line.");
    return problems;
  }

  entry.lines.forEach((line, index) => {
    problems.push(...validateLine({ line, label: `Line ${index + 1}` }));
  });
  // A line that is not an object cannot be summed or checked further.
  if (entry.lines.some((line) => typeof line !== "object" || line === null)) return problems;

  const hasDebit = entry.lines.some((line) => line.postingType === "Debit");
  const hasCredit = entry.lines.some((line) => line.postingType === "Credit");
  if (!hasDebit || !hasCredit) {
    problems.push("An entry needs at least one debit line and one credit line.");
  }

  const { debitCents, creditCents } = sumSides(entry.lines);
  if (debitCents !== creditCents) {
    problems.push(
      `Debits (${centsToDollars(debitCents).toFixed(2)}) do not equal credits (${centsToDollars(creditCents).toFixed(2)}).`,
    );
  }
  return problems;
}
