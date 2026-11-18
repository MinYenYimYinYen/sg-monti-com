import { format, parseISO } from "date-fns";
import { toCents } from "@/app/salesTax/_lib/buildSalesTaxReport";
import {
  MN_RETURN_FILLER,
  MN_RETURN_LINE_ENDING,
  MN_RETURN_LOCATION,
  MnReturnAmendFlag,
} from "@/app/salesTax/_lib/mnReturnConst";
import { MnSalesTaxReport } from "@/app/salesTax/salesTaxTypes";

const PERIOD_FORMAT = "dd-MMM-yyyy";

/** Whole dollars, half up. Amounts are never negative, so `floor(x + 0.5)` is half up. */
function toWholeDollars(amount: number): number {
  return Math.floor((toCents(amount) + 50) / 100);
}

/**
 * The state rounds the taxable amount to the dollar and then computes tax on it, so a line's tax due
 * is not the on-screen cents figure. Integer arithmetic on the rate in millionths of a percent keeps
 * a result such as 687.5 from drifting to 687.
 */
export function calculateReturnTaxDue({
  taxableDollars,
  ratePercent,
}: {
  taxableDollars: number;
  ratePercent: number;
}): number {
  const rateMillionths = Math.round(ratePercent * 1_000_000);
  return Math.floor((taxableDollars * rateMillionths + 50_000_000) / 100_000_000);
}

/**
 * The Minnesota sales tax return as the text of the state's import file, following the layout of its
 * example files: a header row, a period row, a column header row, then one row for the location.
 *
 * Gross receipts are the net after all discounts of every completed service, exempt ones included,
 * because the return reports receipts and the taxable part separately. Each Minnesota tax type with
 * sales gets a tax type, taxable and tax due triple.
 */
export function buildMnReturnFile({
  report,
  periodEnd,
  amendFlag,
}: {
  report: MnSalesTaxReport;
  periodEnd: string;
  amendFlag: MnReturnAmendFlag;
}): string {
  const periodLabel = format(parseISO(periodEnd), PERIOD_FORMAT);

  const lineColumns = report.mnTaxLines.map(({ mnTaxType, summary }) => {
    const taxableDollars = toWholeDollars(summary.netAfterAllDiscounts);
    const taxDue = calculateReturnTaxDue({
      taxableDollars,
      ratePercent: mnTaxType.ratePercent,
    });
    return [mnTaxType.code, String(taxableDollars), String(taxDue)];
  });

  const receipts = String(toWholeDollars(report.total.netAfterAllDiscounts));

  const rows = [
    [MN_RETURN_FILLER, "FILING PERIOD", "AMEND/ORIG"],
    [MN_RETURN_FILLER, periodLabel, amendFlag],
    [
      MN_RETURN_FILLER,
      "LOCATION",
      "RECEIPTS",
      ...lineColumns.flatMap(() => ["TAX TYPE", "TAXABLE", "TAX DUE"]),
    ],
    [MN_RETURN_FILLER, MN_RETURN_LOCATION, receipts, ...lineColumns.flat()],
  ];

  return rows.map((row) => row.join(",")).join(MN_RETURN_LINE_ENDING) + MN_RETURN_LINE_ENDING;
}
