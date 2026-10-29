"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { renewalLettersSelect } from "../renewalLettersSelect";
import { renewalLettersActions } from "../renewalLettersSlice";
import { prepayConfigSelect } from "@/app/prepayLetters/config/prepayConfigSelect";
import type { RenewalBatchesResult } from "../renewalLettersLogic";
import { groupRowsByBilling, type DisplayBatch } from "../renewalBatchCombining";
import { RENEWAL_RULE_KEYS } from "../renewalBatchLevels";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { Checkbox } from "@/style/components/checkbox";
import { Button } from "@/style/components/button";
import { Download } from "lucide-react";
import { useRenewalLetterPdf } from "../useRenewalLetterPdf";
import { cn } from "@/style/utils";
import { RenewalFlagFilterWarning } from "./RenewalFlagFilterWarning";

// Counts only. Batches can hold thousands of customers, so no customer rows render here.

// The two halves never change, so each one always renders even when empty.
const RENEWAL_HALVES = [
  { renewalKey: RENEWAL_RULE_KEYS.autoRenew, title: "Auto Renew" },
  { renewalKey: RENEWAL_RULE_KEYS.dontAutoRenew, title: "Don't Auto Renew" },
] as const;

function BatchRow({ row }: { row: DisplayBatch }) {
  const dispatch = useAppDispatch();
  const checkedRows = useSelector(renewalLettersSelect.checkedRows);
  const disabledRowIds = useSelector(renewalLettersSelect.disabledRowIds);
  const selectedTemplate = useSelector(renewalLettersSelect.selectedTemplate);
  const isPdfRunning = useSelector(renewalLettersSelect.isPdfRunning);
  const { downloadRows } = useRenewalLetterPdf();

  const isChecked = checkedRows.some((checkedRow) => checkedRow.rowId === row.rowId);
  const isDisabled = disabledRowIds.has(row.rowId);
  const label = row.upsellLabels.length > 0 ? row.upsellLabels.join(" + ") : row.billingLabel;

  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b border-border/50 py-2",
        row.isCombined && "bg-accent/10",
        isDisabled && "opacity-50",
      )}
    >
      {row.canCombine ? (
        <Checkbox
          checked={isChecked}
          disabled={isDisabled}
          onCheckedChange={() => dispatch(renewalLettersActions.toggleCheckedRow(row.rowId))}
          aria-label={`Select ${label}`}
        />
      ) : (
        // Keeps the labels aligned with the checkbox rows.
        <span className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {row.groupCount !== null && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.groupCount} {row.groupCount === 1 ? "group" : "groups"}
        </span>
      )}
      <span className="w-14 text-right text-sm tabular-nums text-foreground">
        {row.customerCount}
      </span>
      <Button
        size="sm"
        variant="outline"
        intensity="ghost"
        disabled={!selectedTemplate || isPdfRunning}
        title={selectedTemplate ? "Download this batch as a PDF" : "Select a form template first"}
        aria-label={`Download ${label}`}
        onClick={() => void downloadRows({ rows: [row] })}
      >
        <Download className="h-3 w-3" />
      </Button>
    </li>
  );
}

/** Styled like an accordion item, but always open: the header is a label, not a control. */
function BillingSection({ section }: { section: ReturnType<typeof groupRowsByBilling>[number] }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm font-medium text-foreground">
        <span>{section.billingLabel}</span>
        <span className="tabular-nums text-muted-foreground">{section.customerCount}</span>
      </div>
      <ul className="px-3">
        {section.rows.map((row) => (
          <BatchRow key={row.rowId} row={row} />
        ))}
      </ul>
    </section>
  );
}

function RenewalHalf({
  title,
  rows,
}: {
  title: string;
  rows: DisplayBatch[];
}) {
  const sections = groupRowsByBilling(rows);
  const customerCount = rows.reduce((sum, row) => sum + row.customerCount, 0);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="text-sm tabular-nums text-muted-foreground">{customerCount}</span>
      </div>
      {sections.length === 0 && (
        <p className="text-sm italic text-muted-foreground">No customers</p>
      )}
      {sections.map((section) => (
        <BillingSection key={section.billingKey} section={section} />
      ))}
    </div>
  );
}

function MissedSection({ missed }: { missed: RenewalBatchesResult["missed"] }) {
  if (missed.length === 0) return null;
  return (
    <section className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <h3 className="text-sm font-medium text-foreground">Not placed in any batch</h3>
      <p className="text-xs text-muted-foreground">
        No rule claimed these customers, so they will not get a letter until the rules cover them.
      </p>
      <ul className="space-y-1.5 text-sm">
        {missed.map((group) => (
          <li key={`${group.levelName}/${group.pathLabel}`}>
            <span className="tabular-nums text-foreground">{group.customerCount}</span>{" "}
            <span className="text-foreground">
              {group.pathLabel} (no {group.levelName} rule matched)
            </span>
            <span className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
              <span>e.g.</span>
              {group.sampleCustIds.map((custId) => (
                <CustomerLink
                  key={custId}
                  customerId={custId}
                  customerTab="customer"
                  className="text-primary hover:underline"
                >
                  {custId}
                </CustomerLink>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RenewalBatchesPanel() {
  const config = useSelector(prepayConfigSelect.draft);
  const result = useSelector(renewalLettersSelect.batches);
  const rows = useSelector(renewalLettersSelect.displayBatches);
  const checkedRows = useSelector(renewalLettersSelect.checkedRows);
  const loadedSeason = useSelector(renewalLettersSelect.loadedSeason);
  const isSeasonStale = useSelector(renewalLettersSelect.isSeasonStale);

  if (!config) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Open a prepay config to build batches.
      </div>
    );
  }

  if (!result || result.totalCustomers === 0) {
    return (
      <div className="p-6 space-y-4 text-sm text-muted-foreground">
        <RenewalFlagFilterWarning compact />
        <p>No customers to show. Use Get Customers to load season {config.season}.</p>
      </div>
    );
  }

  // The counts come from the old season's services, so they are hidden rather than shown wrong.
  if (isSeasonStale) {
    return (
      <div className="p-6 space-y-4">
        <RenewalFlagFilterWarning compact />
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
        >
          <p className="font-medium">Customers are for the wrong season</p>
          <p className="text-xs text-muted-foreground">
            The loaded customers belong to season {loadedSeason}, but the open config is for season{" "}
            {config.season}. Use Get Customers to reload.
          </p>
        </div>
      </div>
    );
  }

  const lettersToPrint = rows.reduce((sum, row) => sum + row.customerCount, 0);

  return (
    <div className="p-6 space-y-6">
      <RenewalFlagFilterWarning compact />
      <div className="text-sm text-muted-foreground">
        <span className="tabular-nums text-foreground">{result.totalCustomers}</span> customers
        loaded for season <span className="tabular-nums text-foreground">{config.season}</span>,{" "}
        <span className="tabular-nums text-foreground">{lettersToPrint}</span> in{" "}
        <span className="tabular-nums text-foreground">{rows.length}</span> batches,{" "}
        <span className="tabular-nums text-foreground">{result.confirmedCount}</span> already
        confirmed
        {checkedRows.length > 0 && (
          <span className="ml-3 text-foreground">{checkedRows.length} selected</span>
        )}
      </div>

      <MissedSection missed={result.missed} />

      <div className="flex gap-6">
        {RENEWAL_HALVES.map((half) => (
          <RenewalHalf
            key={half.renewalKey}
            title={half.title}
            rows={rows.filter((row) => row.renewalKey === half.renewalKey)}
          />
        ))}
      </div>
    </div>
  );
}
