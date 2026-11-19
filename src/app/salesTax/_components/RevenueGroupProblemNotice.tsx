"use client";

import { useSelector } from "react-redux";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { formatMoney } from "@/app/salesTax/_components/SalesTaxSummaryTable";
import { RevenueGroupProblem } from "@/app/salesTax/salesTaxTypes";
import { labelMnTaxCode } from "@/app/salesTax/stateTaxRevenueGroups/_lib/revenueGroupLogic";
import { stateTaxRevenueGroupSelect } from "@/app/salesTax/stateTaxRevenueGroups/stateTaxRevenueGroupSelect";

/**
 * The warning text for one failing revenue group. The popover lists each customer who is on some of
 * the group's lines but not all, linked to the CRM, because those are the customers to check. Tax
 * types are named by description, since the code alone does not tell the reader which line it is.
 */
export function RevenueGroupProblemNotice({ problem }: { problem: RevenueGroupProblem }) {
  const group = useSelector(stateTaxRevenueGroupSelect.groupByKey).get(problem.revenueGroupKey);
  const { lineTotals, customerGaps } = problem;

  const label = (mnTaxCode: string) => labelMnTaxCode({ group, mnTaxCode });
  const labelAll = (mnTaxCodes: string[]) => mnTaxCodes.map(label).join(", ");

  return (
    <span>
      Revenue is not identical across these tax types:{" "}
      {lineTotals
        .map((total) => `${label(total.mnTaxCode)} ${formatMoney(total.netAfterAllDiscounts)}`)
        .join("; ")}
      .{" "}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="font-semibold underline">
            {customerGaps.length} customer(s) to check
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[28rem] p-2" align="start">
          {customerGaps.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              The totals differ but no single customer explains it.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">
                These customers have some of the group&apos;s tax codes but not all.
              </p>
              <div className="max-h-64 overflow-y-auto">
                {customerGaps.map((gap) => (
                  <div key={gap.custId} className="flex items-start gap-3 px-1 py-1 text-sm">
                    <CustomerLink
                      customerId={gap.custId}
                      customerTab="customer"
                      className="w-20 shrink-0 font-mono font-semibold text-primary underline"
                    >
                      {gap.custId}
                    </CustomerLink>
                    <span className="flex-1 text-xs text-muted-foreground">
                      On {labelAll(gap.onMnTaxCodes) || "none"}. Missing from{" "}
                      {labelAll(gap.missingFromMnTaxCodes)}.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </span>
  );
}
