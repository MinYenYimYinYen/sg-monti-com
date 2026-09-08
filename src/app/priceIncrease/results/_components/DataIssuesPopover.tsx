"use client";

import { useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { serviceIncreaseResultsSelect } from "@/app/priceIncrease/results/serviceIncreaseResultsSelect";
import { IncreaseDataIssue, IncreaseDataIssueMissingField } from "@/app/priceIncrease/results/increaseResultsTypes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";

const MISSING_FIELD_LABELS: Record<IncreaseDataIssueMissingField, string> = {
  acqPrice: "No price table (acqPrice)",
  dateSold: "Missing sold date (dateSold)",
};

export function DataIssuesPopover() {
  const dataIssues = useSelector(serviceIncreaseResultsSelect.dataIssues);

  const hasIssues = dataIssues.length > 0;

  // Group issues by missingField
  const grouped = dataIssues.reduce<Record<IncreaseDataIssueMissingField, IncreaseDataIssue[]>>(
    (acc, issue) => {
      if (!acc[issue.missingField]) acc[issue.missingField] = [];
      acc[issue.missingField].push(issue);
      return acc;
    },
    {} as Record<IncreaseDataIssueMissingField, IncreaseDataIssue[]>,
  );

  const groupEntries = Object.entries(grouped) as [IncreaseDataIssueMissingField, IncreaseDataIssue[]][];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
            hasIssues
              ? "border-destructive text-destructive hover:bg-destructive/10"
              : "border-border text-foreground/30 cursor-default pointer-events-none"
          }`}
          disabled={!hasIssues}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {hasIssues ? `${dataIssues.length} data issue${dataIssues.length !== 1 ? "s" : ""}` : "No issues"}
        </button>
      </PopoverTrigger>

      {hasIssues && (
        <PopoverContent
          align="start"
          className="w-96 max-h-[70vh] overflow-y-auto p-0"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Data Issues</p>
            <p className="text-xs text-foreground/50">
              {dataIssues.length} service{dataIssues.length !== 1 ? "s" : ""} could not be computed
            </p>
          </div>

          <Accordion type="multiple" className="px-1 py-1">
            {groupEntries.map(([missingField, issues]) => (
              <AccordionItem key={missingField} value={missingField} className="border-0">
                <AccordionTrigger className="px-2 py-2 text-sm hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {MISSING_FIELD_LABELS[missingField]}
                    </span>
                    <span className="text-xs text-foreground/50">
                      — {issues.length} service{issues.length !== 1 ? "s" : ""}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-48 overflow-y-auto space-y-1 px-2 pb-1">
                    {issues.map((issue) => (
                      <p
                        key={`${issue.custId}-${issue.servId}`}
                        className="text-xs text-foreground/60 py-0.5"
                      >
                        {issue.message}
                      </p>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </PopoverContent>
      )}
    </Popover>
  );
}
