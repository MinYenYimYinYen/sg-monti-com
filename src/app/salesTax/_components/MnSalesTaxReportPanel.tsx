"use client";

import { useSelector } from "react-redux";
import { Accordion } from "@/style/components/accordion";
import { MnTaxLineItem } from "@/app/salesTax/_components/MnTaxLineItem";
import {
  NonTaxableSalesItem,
  TotalAndReconciliationItem,
  UnmappedTaxCodesItem,
} from "@/app/salesTax/_components/MnTotalItems";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";

/**
 * The Minnesota report: one nested accordion item per tax type, then the non-taxable, unmapped and
 * total items. The parent accordion owns the empty states and the warnings.
 */
export function MnSalesTaxReportPanel() {
  const report = useSelector(salesTaxUISelect.mnTaxReport);
  const mismatchedTaxCodeIds = useSelector(salesTaxUISelect.mismatchedTaxCodeIds);

  if (!report) return null;

  const mismatchedIds = new Set(mismatchedTaxCodeIds);

  return (
    <Accordion type="single" collapsible className="rounded-md border border-border bg-card px-3">
      {report.mnTaxLines.map((mnTaxLine) => (
        <MnTaxLineItem
          key={mnTaxLine.mnTaxType.code}
          mnTaxLine={mnTaxLine}
          isMismatched={mnTaxLine.taxCodeIds.some((id) => mismatchedIds.has(id))}
        />
      ))}
      {report.nonTaxableSales.length > 0 && <NonTaxableSalesItem report={report} />}
      {report.unmappedTaxCodes.length > 0 && <UnmappedTaxCodesItem report={report} />}
      <TotalAndReconciliationItem report={report} />
    </Accordion>
  );
}
