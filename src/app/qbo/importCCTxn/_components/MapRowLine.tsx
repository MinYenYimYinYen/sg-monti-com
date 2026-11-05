"use client";

import { shallowEqual, useSelector } from "react-redux";
import { AlertTriangle, Check } from "lucide-react";
import { AppState } from "@/store";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { cn } from "@/style/utils";
import { importDecisionSelect } from "@/app/qbo/importCCTxn/decisions/importDecisionSelect";
import { useImportDecision } from "@/app/qbo/importCCTxn/decisions/useImportDecision";
import { formatCents } from "@/app/qbo/importCCTxn/_lib/importFileUtils";
import { MapRowVendorPicker } from "@/app/qbo/importCCTxn/_components/MapRowVendorPicker";
import { MapRowAccountPicker } from "@/app/qbo/importCCTxn/_components/MapRowAccountPicker";
import { InferredConfirmCheckbox } from "@/app/qbo/importCCTxn/_components/InferredConfirmCheckbox";
import { SkipAlwaysCheckbox } from "@/app/qbo/importCCTxn/_components/SkipAlwaysCheckbox";
import { CardholderLabel } from "@/app/qbo/importCCTxn/_components/CardholderLabel";

// check, transaction, amount, vendor, account, action. The three flexible columns share the extra
// width, so the pickers grow with the screen instead of wrapping. The notes line under each row is
// indented (pl-8) to match the check column, which is 1.25rem plus the 0.75rem gap.
const ROW_COLUMNS =
  "xl:grid-cols-[1.25rem_minmax(14rem,1.3fr)_5.5rem_minmax(12rem,1fr)_minmax(12rem,1fr)_5.5rem]";

/**
 * One transaction on the Map tab. Key it on rowId and pass only the id: the row reads its own
 * view from state, so a pick on a sibling updates it without the parent re-rendering. A secondary
 * background means the vendor was filled in for this row and nobody has confirmed it. A green
 * check means the row is ready to save.
 */
export function MapRowLine({ rowId }: { rowId: string }) {
  const row = useSelector((state: AppState) => importDecisionSelect.pendingRow(state, rowId));
  const view = useSelector(
    (state: AppState) => importDecisionSelect.rowView(state, rowId),
    shallowEqual,
  );
  const { setRowSkipped, setAlwaysSkip } = useImportDecision();

  if (!row || !view) return null;

  const undoSkip = () => {
    // A row skipped by an "Always?" tick is released by clearing the tick too.
    if (view.isAlwaysSkip) setAlwaysSkip({ merchantKey: view.merchantKey, isAlwaysSkip: false });
    setRowSkipped({ rowId, isSkipped: false });
  };

  return (
    <div
      className={cn(
        "space-y-2 rounded-md border p-3",
        view.needsConfirmation ? "border-secondary/40 bg-secondary/10" : "border-border bg-card",
        view.isSkipped && "opacity-70",
      )}
    >
      {/* Wide screens use fixed columns so every row lines up; narrow ones wrap as a flow. */}
      <div className={`flex flex-wrap items-center gap-3 xl:grid xl:flex-nowrap ${ROW_COLUMNS}`}>
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center"
          aria-label={view.isReady ? "Ready" : "Not ready"}
        >
          {view.isReady && <Check className="h-5 w-5 text-accent" />}
        </div>

        <div className="min-w-56 flex-1 xl:min-w-0">
          <CardholderLabel formatId={row.formatId} last4={row.last4} />
          <div className="truncate font-mono text-sm font-semibold text-foreground">
            {row.description}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.transactionDate}, card {row.last4}
          </div>
        </div>
        <div className="text-right text-sm font-medium text-foreground">
          {formatCents(row.amountCents)}
        </div>

        {view.isSkipped ? (
          <>
            <div className="xl:col-span-2">
              <Badge variant="secondary" intensity="soft">
                {view.skipSource === "rule" ? "Always skipped" : "Skipped"}
              </Badge>
            </div>
            <Button variant="primary" intensity="soft" size="sm" onClick={undoSkip}>
              Undo skip
            </Button>
          </>
        ) : (
          <>
            <MapRowVendorPicker rowId={rowId} />
            <MapRowAccountPicker rowId={rowId} />
            <Button
              variant="destructive"
              intensity="soft"
              size="sm"
              onClick={() => setRowSkipped({ rowId, isSkipped: true })}
            >
              Skip
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-8">
        <SkipAlwaysCheckbox rowId={rowId} />
        <InferredConfirmCheckbox rowId={rowId} />
        {view.replacesStoredVendor && (
          <span className="inline-flex items-center gap-1 text-xs text-secondary">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Replaces the vendor saved for this merchant. Its other transactions will change too.
          </span>
        )}
        {view.problem && <span className="text-xs text-destructive">{view.problem}</span>}
      </div>
    </div>
  );
}
