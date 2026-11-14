"use client";

import { useSelector } from "react-redux";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { AppState } from "@/store";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { useImportPost } from "@/app/qbo/importCCTxn/post/useImportPost";
import { useImportRow } from "@/app/qbo/importCCTxn/rows/useImportRow";
import { formatCents } from "@/app/qbo/importCCTxn/_lib/importFileUtils";
import { DEFAULT_MANUAL_SKIP_REASON } from "@/app/qbo/importCCTxn/_lib/importSkipUtils";
import { RowAccountPicker } from "@/app/qbo/importCCTxn/_components/RowAccountPicker";
import { ConfirmMerchantCheckbox } from "@/app/qbo/importCCTxn/_components/ConfirmMerchantCheckbox";

/** One postable or unsettled row. Key it on rowId and pass only the id. */
export function PostRowLine({ rowId }: { rowId: string }) {
  const row = useSelector((state: AppState) =>
    importRowSelect.openRows(state).find((openRow) => openRow.rowId === rowId),
  );
  const allows = useSelector(userCapabilitiesSelect.allows);
  const { previewPost, reconcileRow } = useImportPost();
  const { setSkip } = useImportRow({ autoLoad: false });

  if (!row) return null;
  const needsReconcile = row.status === "unknown" || row.status === "posting";

  return (
    <div className="space-y-1 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <div className="font-mono text-sm font-semibold text-foreground">{row.description}</div>
          <div className="text-xs text-muted-foreground">
            {row.transactionDate}, card {row.last4}
          </div>
        </div>
        <div className="text-sm font-medium text-foreground">{formatCents(row.amountCents)}</div>
        {!needsReconcile && <RowAccountPicker row={row} />}
        {row.status !== "pending" && (
          <Badge variant={row.status === "failed" ? "destructive" : "secondary"} intensity="soft">
            {row.status}
          </Badge>
        )}
        {needsReconcile ? (
          <Button
            variant="primary"
            intensity="soft"
            disabled={!allows(can.qboExpensePostings.write)}
            onClick={() => reconcileRow(row.rowId)}
          >
            Look in QuickBooks
          </Button>
        ) : (
          <>
            {/* Only a pending row can be skipped. A failed row has already been tried. */}
            {row.status === "pending" && (
              <Button
                variant="destructive"
                intensity="soft"
                disabled={!allows(can.ccImportRows.write)}
                onClick={() =>
                  setSkip({ rowId: row.rowId, skipReason: DEFAULT_MANUAL_SKIP_REASON })
                }
              >
                Skip
              </Button>
            )}
            <Button variant="primary" onClick={() => previewPost(row.rowId)}>
              Review and post
            </Button>
          </>
        )}
      </div>
      {!needsReconcile && (
        <ConfirmMerchantCheckbox merchantKey={row.merchantKey} description={row.description} />
      )}
      {row.postMessage && <p className="text-xs text-muted-foreground">{row.postMessage}</p>}
    </div>
  );
}
