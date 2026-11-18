"use client";

import { useSelector } from "react-redux";
import { SalesTaxSummaryTable } from "@/app/salesTax/_components/SalesTaxSummaryTable";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";

/**
 * The tax computed from each customer's RealGreen tax codes, one row per code. A service is listed
 * under every code its customer has, so only the total row can be summed.
 */
export function RealGreenTaxReportPanel() {
  const report = useSelector(salesTaxUISelect.taxReport);

  if (!report) return null;

  const taxCodeRows = [...report.byTaxCodeId.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([taxCodeId, summary]) => ({ rowKey: taxCodeId, label: taxCodeId, summary }));
  const untaxedRows =
    report.untaxed.services.length > 0
      ? [{ rowKey: "noTaxCode", label: "(no tax code)", summary: report.untaxed }]
      : [];

  return (
    <div className="flex flex-col gap-2">
      <SalesTaxSummaryTable
        labelHeader="RealGreen tax code"
        summaryRows={[
          ...taxCodeRows,
          ...untaxedRows,
          { rowKey: "total", label: "Total (each service once)", summary: report.total },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Tax is computed from the customer&apos;s tax codes on the net after all discounts, rounded
        per code and per service the way RealGreen does. A service counts under each tax code its
        customer has, so only the total row can be summed.
      </p>
    </div>
  );
}
