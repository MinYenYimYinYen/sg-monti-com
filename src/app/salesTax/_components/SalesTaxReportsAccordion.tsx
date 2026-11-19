"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { MnReturnExportPanel } from "@/app/salesTax/_components/MnReturnExportPanel";
import { MnSalesTaxReportPanel } from "@/app/salesTax/_components/MnSalesTaxReportPanel";
import { RealGreenTaxReportPanel } from "@/app/salesTax/_components/RealGreenTaxReportPanel";
import { RevenueGroupProblemNotice } from "@/app/salesTax/_components/RevenueGroupProblemNotice";
import { formatMoney } from "@/app/salesTax/_components/SalesTaxSummaryTable";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";

const REALGREEN_ITEM = "realGreen";
const MINNESOTA_ITEM = "minnesota";

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm text-secondary">
      {children}
    </div>
  );
}

/**
 * The two reports for the chosen month as two accordion items: the RealGreen report by RealGreen
 * tax code and the Minnesota report by Minnesota tax type. Both can be open to compare them. The
 * warnings sit above the accordion so they show while the Minnesota item is closed.
 */
export function SalesTaxReportsAccordion() {
  const taxReport = useSelector(salesTaxUISelect.taxReport);
  const mnTaxReport = useSelector(salesTaxUISelect.mnTaxReport);
  const dateRange = useSelector(salesTaxUISelect.dateRange);
  const unmappedTaxCodeIds = useSelector(salesTaxUISelect.unmappedTaxCodeIds);
  const mismatchedTaxCodeIds = useSelector(salesTaxUISelect.mismatchedTaxCodeIds);
  const revenueGroupProblems = useSelector(salesTaxUISelect.revenueGroupProblems);

  if (!taxReport || !mnTaxReport) {
    return <p className="text-sm text-muted-foreground">Pick a month.</p>;
  }
  if (taxReport.total.services.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No completed services loaded for {dateRange?.min} to {dateRange?.max}. Click Load.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {unmappedTaxCodeIds.length > 0 && (
        <Warning>
          {unmappedTaxCodeIds.length} RealGreen tax code(s) used this month have no Minnesota
          mapping, so their sales are on no Minnesota line: {unmappedTaxCodeIds.join(", ")}.{" "}
          <Link href="/salesTax/salesTaxMapping" className="font-semibold underline">
            Map them
          </Link>
        </Warning>
      )}
      {mismatchedTaxCodeIds.length > 0 && (
        <Warning>
          The Minnesota rates do not add up to the RealGreen rate for:{" "}
          {mismatchedTaxCodeIds.join(", ")}. Tax on those lines differs from what was charged.
        </Warning>
      )}
      {revenueGroupProblems.map((problem) => (
        <Warning key={problem.revenueGroupKey}>
          <RevenueGroupProblemNotice problem={problem} />
        </Warning>
      ))}

      <Accordion
        type="multiple"
        defaultValue={[MINNESOTA_ITEM]}
        className="rounded-md border border-border bg-card px-3"
      >
        <AccordionItem value={REALGREEN_ITEM}>
          <AccordionTrigger>
            <span className="flex flex-1 items-center gap-3 pr-3 text-base">
              <span className="flex-1">RealGreen tax report</span>
              <span className="text-right tabular-nums font-semibold">
                {formatMoney(taxReport.total.taxAmount)}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <RealGreenTaxReportPanel />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value={MINNESOTA_ITEM} className="border-b-0">
          <AccordionTrigger>
            <span className="flex flex-1 items-center gap-3 pr-3 text-base">
              <span className="flex-1">Minnesota tax report</span>
              <span className="text-right tabular-nums font-semibold">
                {formatMoney(mnTaxReport.mnTaxAmount)}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <MnSalesTaxReportPanel />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <MnReturnExportPanel />
    </section>
  );
}
