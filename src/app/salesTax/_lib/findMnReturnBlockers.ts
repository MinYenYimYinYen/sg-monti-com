import { TRange } from "@/lib/primatives/tRange/TRange";
import { isSingleMonthRange } from "@/app/salesTax/_lib/salesTaxDateRange";
import { MnSalesTaxReport } from "@/app/salesTax/salesTaxTypes";

/**
 * Why the return file cannot be built yet, in words the user can act on. Empty means it can. A rate
 * mismatch is not a blocker: it is shown as a warning on the report, and the file still reflects the
 * Minnesota rates, which are what the state applies.
 */
export function findMnReturnBlockers({
  report,
  dateRange,
}: {
  report: MnSalesTaxReport | null;
  dateRange: TRange<string> | null;
}): string[] {
  if (!report || !dateRange) return ["Pick a month and load its completed services."];
  if (!isSingleMonthRange(dateRange)) return ["The return covers exactly one calendar month."];
  if (report.total.services.length === 0) {
    return ["No completed services are loaded for this month."];
  }

  const blockers: string[] = [];
  if (report.unmappedTaxCodes.length > 0) {
    const taxCodeIds = report.unmappedTaxCodes.map(({ taxCodeId }) => taxCodeId).join(", ");
    blockers.push(
      `These RealGreen tax codes have sales but no Minnesota mapping, so those sales would be in receipts and on no tax line: ${taxCodeIds}.`,
    );
  }
  if (report.mnTaxLines.length === 0) {
    blockers.push("No sales are on a Minnesota tax line yet.");
  }
  return blockers;
}
