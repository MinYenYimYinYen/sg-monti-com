import { RealGreenTaxReport, RealGreenTaxSummary } from "@/app/salesTax/salesTaxTypes";

const LINE_ENDING = "\r\n";
export const NO_TAX_CODE_LABEL = "(no tax code)";
export const TOTAL_LABEL = "Total (each service once)";

const HEADER = [
  "RealGreen tax code",
  "Services",
  "Price",
  "Discount",
  "Prepay discount",
  "Net after discounts",
  "Tax",
];

/** A field is quoted only when it holds a comma, a quote or a line break. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const money = (amount: number) => amount.toFixed(2);

function summaryRow({ label, summary }: { label: string; summary: RealGreenTaxSummary }): string[] {
  return [
    label,
    String(summary.services.length),
    money(summary.price),
    money(summary.discountAmt),
    money(summary.ppyDiscAmt),
    money(summary.netAfterAllDiscounts),
    money(summary.taxAmount),
  ];
}

/**
 * The RealGreen tax code report as CSV, with the rows and columns of the table on the sales tax
 * page: one row per tax code, a "(no tax code)" row when some services have none, and a total row.
 * A service is listed under every tax code its customer has, so only the total row can be summed.
 * It goes to QuickBooks as the source data of the payment.
 */
export function buildTaxCodeReportCsv(report: RealGreenTaxReport): string {
  const taxCodeRows = [...report.byTaxCodeId.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([taxCodeId, summary]) => summaryRow({ label: taxCodeId, summary }));
  const untaxedRows =
    report.untaxed.services.length > 0
      ? [summaryRow({ label: NO_TAX_CODE_LABEL, summary: report.untaxed })]
      : [];
  const totalRow = summaryRow({ label: TOTAL_LABEL, summary: report.total });

  return (
    [HEADER, ...taxCodeRows, ...untaxedRows, totalRow]
      .map((row) => row.map(csvField).join(","))
      .join(LINE_ENDING) + LINE_ENDING
  );
}
