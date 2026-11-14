"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/style/components/collapsible";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { useImportRow } from "@/app/qbo/importCCTxn/rows/useImportRow";
import { formatCents, skipReasonLabels } from "@/app/qbo/importCCTxn/_lib/importFileUtils";

/**
 * Rows that were skipped and can be brought back. Payments and refunds are not listed, because
 * they are never posted. Restoring returns the row to pending, so it shows up on the Map and
 * Post tabs again.
 */
export function SkippedRowsSection() {
  const skippedRows = useSelector(importRowSelect.restorableSkippedRows);
  const autoSkippedCount = useSelector(importRowSelect.autoSkippedCount);
  const canRestore = useSelector(userCapabilitiesSelect.allows)(
    can.ccImportRows.write,
  );
  const { setSkip } = useImportRow({ autoLoad: false });
  const [isOpen, setIsOpen] = useState(false);

  if (skippedRows.length === 0 && autoSkippedCount === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="primary" intensity="ghost" className="gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {skippedRows.length} skipped row{skippedRows.length === 1 ? "" : "s"}
          {autoSkippedCount > 0 && ` (plus ${autoSkippedCount} payment or refund)`}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {skippedRows.map((row) => (
          <div
            key={row.rowId}
            className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3"
          >
            <div className="min-w-56 flex-1">
              <div className="font-mono text-sm font-semibold text-foreground">
                {row.description}
              </div>
              <div className="text-xs text-muted-foreground">
                {row.transactionDate}, card {row.last4}
              </div>
            </div>
            <div className="text-sm font-medium text-foreground">{formatCents(row.amountCents)}</div>
            {row.skipReason && (
              <Badge variant="secondary" intensity="soft">
                {skipReasonLabels[row.skipReason]}
              </Badge>
            )}
            <Button
              variant="primary"
              intensity="soft"
              disabled={!canRestore}
              onClick={() => setSkip({ rowId: row.rowId, skipReason: null })}
            >
              Restore
            </Button>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
