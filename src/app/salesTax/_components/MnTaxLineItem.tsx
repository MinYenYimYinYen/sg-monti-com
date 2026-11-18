"use client";

import { Badge } from "@/style/components/badge";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/style/components/accordion";
import { SalesTaxSummaryTable, formatMoney } from "@/app/salesTax/_components/SalesTaxSummaryTable";
import { MnTaxLine } from "@/app/salesTax/salesTaxTypes";

/** One Minnesota tax type: the header carries the headline numbers, opening it shows the report. */
export function MnTaxLineItem({
  mnTaxLine,
  isMismatched,
}: {
  mnTaxLine: MnTaxLine;
  isMismatched: boolean;
}) {
  const { mnTaxType, taxCodeIds, summary } = mnTaxLine;

  return (
    <AccordionItem value={mnTaxType.code}>
      <AccordionTrigger>
        <span className="flex flex-1 items-center gap-3 pr-3">
          <span className="w-10 font-mono">{mnTaxType.code}</span>
          <span className="flex-1">{mnTaxType.description}</span>
          {isMismatched && (
            <Badge variant="secondary" intensity="soft">
              Check mapping
            </Badge>
          )}
          <span className="w-16 text-right tabular-nums text-muted-foreground">
            {mnTaxType.ratePercent}%
          </span>
          <span className="w-28 text-right tabular-nums">
            {formatMoney(summary.netAfterAllDiscounts)}
          </span>
          <span className="w-24 text-right font-semibold tabular-nums">
            {formatMoney(summary.taxAmount)}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-2">
          <SalesTaxSummaryTable
            labelHeader="Tax type"
            summaryRows={[{ rowKey: mnTaxType.code, label: mnTaxType.code, summary }]}
          />
          <p className="text-xs text-muted-foreground">
            Fed by RealGreen tax code(s): {taxCodeIds.join(", ")}. Tax is the net after discounts
            times {mnTaxType.ratePercent}%.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
