"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { DateRangePicker } from "@/components/DateRangePicker";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { useImportPost } from "@/app/qbo/importCCTxn/post/useImportPost";
import { validateBatchRange } from "@/app/qbo/importCCTxn/_lib/importBatchPlanUtils";
import { formatCents } from "@/app/qbo/importCCTxn/_lib/importFileUtils";

/**
 * Chooses the dates to post. Nothing is written from here: "Review" only asks the server what
 * the range would send, and the confirmation dialog is the deliberate second step.
 */
export function BatchPostCard() {
  const postableRows = useSelector(importRowSelect.postableRows);
  const { previewBatch } = useImportPost();
  const [range, setRange] = useState<TRange<string>>({ min: "", max: "" });

  const problem = validateBatchRange({ startDate: range.min, endDate: range.max });
  const inRange = postableRows.filter(
    (row) =>
      row.kind === "charge" && row.transactionDate >= range.min && row.transactionDate <= range.max,
  );
  const inRangeCents = inRange.reduce((total, row) => total + row.amountCents, 0);

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div>
        <div className="text-sm font-semibold text-foreground">Post a date range</div>
        <p className="text-xs text-muted-foreground">
          Choose the transaction dates, for example one month. You will see the count and total,
          and anything that cannot be posted, before anything is sent. Rows go to QuickBooks in
          batches of 30, and posting stops after the first batch in which a row does not post.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={range} onChange={setRange} />
        <Button
          variant="primary"
          disabled={problem !== null}
          onClick={() => previewBatch({ startDate: range.min, endDate: range.max })}
        >
          Review
        </Button>
        {problem === null && (
          <span className="text-xs text-muted-foreground">
            {inRange.length} row{inRange.length === 1 ? "" : "s"} in range, {formatCents(inRangeCents)}
          </span>
        )}
      </div>
    </div>
  );
}
