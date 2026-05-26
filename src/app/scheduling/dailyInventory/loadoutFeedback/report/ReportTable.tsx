"use client";

import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { loadoutReportSelect } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/loadoutReportSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { LoadoutReportEntry } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/LoadoutReportTypes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/style/components/accordion";
import { LandPlot } from "lucide-react";

// ---------------------------------------------------------------------------
// Compliance summary helpers
// ---------------------------------------------------------------------------

function getComplianceCounts(entry: LoadoutReportEntry): {
  pass: number;
  fail: number;
  noRule: number;
} {
  let pass = 0;
  let fail = 0;
  let noRule = 0;
  for (const service of entry.completedServices) {
    const result = service.x.productRuleCompliance;
    if (result === "pass") pass++;
    else if (result === "fail") fail++;
    else noRule++;
  }
  return { pass, fail, noRule };
}

// ---------------------------------------------------------------------------
// Per-date row inside an employee accordion
// ---------------------------------------------------------------------------

function EntryRow({ entry }: { entry: LoadoutReportEntry }) {
  const router = useRouter();
  const { pass, fail } = getComplianceCounts(entry);
  const complianceTotal = pass + fail;
  const complianceRate =
    complianceTotal > 0 ? Math.round((pass / complianceTotal) * 100) : null;

  const otherFeedback = entry.feedback.otherFeedback;

  return (
    <div className="flex flex-col gap-1 border-b border-foreground/5 last:border-0 py-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() =>
            router.push(
              `/scheduling/dailyInventory/loadoutFeedback/${entry.employeeId}/${entry.routeDate}`,
            )
          }
          className="text-sm text-foreground hover:text-primary transition-colors text-left"
        >
          {prettyDate(entry.routeDate, "eee, MMM dd, yyyy")}
        </button>
        <span className="text-xs text-primary font-medium">View →</span>
      </div>

      {/* Compliance summary */}
      <div className="flex items-center gap-4 text-xs text-foreground/60 pl-2">
        <span className="flex items-center gap-1">
          <LandPlot className="size-3" />
          {entry.completedServices.length} completed
        </span>
        {complianceRate !== null && (
          <span
            className={
              complianceRate >= 90
                ? "text-accent font-medium"
                : complianceRate >= 70
                  ? "text-secondary font-medium"
                  : "text-destructive font-medium"
            }
          >
            {complianceRate}% correct product
          </span>
        )}
        {fail > 0 && (
          <span className="text-destructive">{fail} fail{fail !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Actual vs Posted per product */}
      {otherFeedback.length > 0 && (
        <div className="pl-2 flex flex-col gap-0.5">
          {otherFeedback.map((row) => {
            const pct =
              row.postedAmount > 0
                ? ((row.actualVsPosted / row.postedAmount) * 100).toFixed(1)
                : null;
            const colorClass =
              pct === null
                ? "text-foreground/40"
                : Math.abs(parseFloat(pct)) < 5
                  ? "text-foreground/40"
                  : parseFloat(pct) > 0
                    ? "text-destructive"
                    : "text-accent";
            return (
              <div
                key={row.productId}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-foreground/60">{row.description}</span>
                <span className={`tabular-nums font-medium ${colorClass}`}>
                  {pct !== null
                    ? `${parseFloat(pct) >= 0 ? "+" : ""}${pct}%`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main report table — grouped by employee
// ---------------------------------------------------------------------------

export function ReportTable() {
  const employeeIds = useSelector(loadoutReportSelect.employeeIds);
  const entriesByEmployee = useSelector(loadoutReportSelect.entriesByEmployee);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  if (employeeIds.length === 0) {
    return (
      <p className="text-sm text-foreground/40 italic">
        No finished loadouts found for this date range.
      </p>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {employeeIds.map((employeeId) => {
        const entries = entriesByEmployee.get(employeeId) ?? [];
        const name = employeeMap.get(employeeId)?.name ?? employeeId;

        return (
          <AccordionItem key={employeeId} value={employeeId}>
            <AccordionTrigger className="py-2">
              <span className="font-semibold text-foreground">{name}</span>
              <span className="text-xs text-foreground/50 ml-2 mr-auto">
                {entries.length} loadout{entries.length !== 1 ? "s" : ""}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col pb-2">
                {entries.map((entry) => (
                  <EntryRow
                    key={`${entry.employeeId}:${entry.routeDate}`}
                    entry={entry}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
