"use client";

import { Badge } from "@/style/components/badge";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/style/components/accordion";
import { SalesTaxSummaryTable, formatMoney } from "@/app/salesTax/_components/SalesTaxSummaryTable";
import { MnSalesTaxReport } from "@/app/salesTax/salesTaxTypes";

export const UNMAPPED_ITEM = "unmapped";
export const NON_TAXABLE_ITEM = "nonTaxable";
export const TOTAL_ITEM = "total";

/**
 * Exempt sales (a 0% tax code with no mapping, or no tax code at all). They count in gross receipts
 * but sit on no Minnesota line. Shown only when there are any.
 */
export function NonTaxableSalesItem({ report }: { report: MnSalesTaxReport }) {
  return (
    <AccordionItem value={NON_TAXABLE_ITEM}>
      <AccordionTrigger>
        <span className="flex flex-1 items-center gap-3 pr-3">
          <span className="flex-1">Non-taxable sales</span>
          <span className="w-28 text-right tabular-nums">
            {formatMoney(report.nonTaxableTotal.netAfterAllDiscounts)}
          </span>
          <span className="w-24" />
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-2">
          <SalesTaxSummaryTable
            labelHeader="RealGreen tax code"
            summaryRows={report.nonTaxableSales.map(({ taxCodeId, summary }) => ({
              rowKey: taxCodeId ?? "noTaxCode",
              label: taxCodeId ?? "(no tax code)",
              summary,
            }))}
          />
          <p className="text-xs text-muted-foreground">
            A tax code with a 0% rate and no mapping is treated as exempt, and so is a customer with
            no tax code. These sales are part of the total but are on no Minnesota line.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/** Shown only when this month's services use a RealGreen tax code that has no mapping. */
export function UnmappedTaxCodesItem({ report }: { report: MnSalesTaxReport }) {
  return (
    <AccordionItem value={UNMAPPED_ITEM}>
      <AccordionTrigger>
        <span className="flex flex-1 items-center gap-3 pr-3">
          <span className="flex-1">Unmapped tax codes</span>
          <Badge variant="destructive" intensity="soft">
            {report.unmappedTaxCodes.length}
          </Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <SalesTaxSummaryTable
          labelHeader="RealGreen tax code"
          summaryRows={report.unmappedTaxCodes.map(({ taxCodeId, summary }) => ({
            rowKey: taxCodeId,
            label: taxCodeId,
            summary,
          }))}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

/** The all-services total, and the Minnesota tax set against what RealGreen computed. */
export function TotalAndReconciliationItem({ report }: { report: MnSalesTaxReport }) {
  const difference =
    Math.round((report.mnTaxAmount - report.realGreenMappedTaxAmount) * 100) / 100;

  return (
    <AccordionItem value={TOTAL_ITEM} className="border-b-0">
      <AccordionTrigger>
        <span className="flex flex-1 items-center gap-3 pr-3">
          <span className="flex-1">Total and reconciliation</span>
          <span className="w-24 text-right font-semibold tabular-nums">
            {formatMoney(report.mnTaxAmount)}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-3">
          <SalesTaxSummaryTable
            labelHeader="All completed services"
            summaryRows={[
              { rowKey: TOTAL_ITEM, label: "Each service once", summary: report.total },
            ]}
          />
          <dl className="grid max-w-md grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums">
            <dt>Minnesota tax (sum of lines)</dt>
            <dd className="text-right">{formatMoney(report.mnTaxAmount)}</dd>
            <dt>RealGreen tax, mapped codes</dt>
            <dd className="text-right">{formatMoney(report.realGreenMappedTaxAmount)}</dd>
            <dt className="font-semibold">Difference</dt>
            <dd className="text-right font-semibold">{formatMoney(difference)}</dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            RealGreen rounds each code up per service when there was no discount, so it runs a
            little above the state&apos;s calculation. The Minnesota lines are what the return
            uses.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
