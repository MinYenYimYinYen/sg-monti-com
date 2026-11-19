import { checkReturnFileMatchesPeriod } from "@/app/salesTax/salesTaxPosting/_lib/mnReturnFileReader";
import { validatePeriodEnd } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingUtils";

// Pure checks of what the browser sends. The data arrives as JSON, so types are checked at runtime.

// The two files are a few kilobytes. This only stops an absurd request.
const MAX_FILE_CHARS = 500_000;

export function isIsoDateShape(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function checkFileText({ text, label }: { text: unknown; label: string }): string | null {
  if (typeof text !== "string" || text.length === 0) return `${label} is missing.`;
  if (text.length > MAX_FILE_CHARS) return `${label} is too large.`;
  return null;
}

/** Everything wrong with a post request that can be seen without QuickBooks. Empty means well formed. */
export function validatePostInput({
  periodEnd,
  paymentCents,
  expectedBalanceCents,
  returnFileText,
  taxCodeReportCsv,
  today,
}: {
  periodEnd: unknown;
  paymentCents: unknown;
  expectedBalanceCents: unknown;
  returnFileText: unknown;
  taxCodeReportCsv: unknown;
  today: string;
}): string[] {
  const periodProblem = validatePeriodEnd({ periodEnd, today });
  if (periodProblem) return [periodProblem];

  const problems: string[] = [];
  if (!Number.isSafeInteger(paymentCents) || (paymentCents as number) <= 0) {
    problems.push("The payment must be a positive whole number of cents.");
  }
  if (!Number.isSafeInteger(expectedBalanceCents)) {
    problems.push("The balance the payment was checked against is missing.");
  }
  const returnFileProblem = checkFileText({ text: returnFileText, label: "The Minnesota return file" });
  if (returnFileProblem) problems.push(returnFileProblem);
  const csvProblem = checkFileText({ text: taxCodeReportCsv, label: "The RealGreen tax code report" });
  if (csvProblem) problems.push(csvProblem);

  if (!returnFileProblem) {
    const mismatch = checkReturnFileMatchesPeriod({
      returnFileText: returnFileText as string,
      periodEnd: periodEnd as string,
    });
    if (mismatch) problems.push(mismatch);
  }
  return problems;
}
