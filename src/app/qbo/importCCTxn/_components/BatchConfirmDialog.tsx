"use client";

import { useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/style/components/alert-dialog";
import { importPostSelect } from "@/app/qbo/importCCTxn/post/importPostSelect";
import { useImportPost } from "@/app/qbo/importCCTxn/post/useImportPost";
import { formatCents } from "@/app/qbo/importCCTxn/_lib/importFileUtils";
import { importCCTxnCapabilities } from "@/app/qbo/importCCTxn/importCCTxnCapabilities";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Shows exactly what a range would send to the live books, and what it would leave out and why.
 * Opens when the server has returned a preview. The Post button sends exactly the rows listed as
 * ready, nothing else. Rows whose description nobody confirmed are counted but never block.
 */
export function BatchConfirmDialog() {
  const batchPreview = useSelector(importPostSelect.batchPreview);
  const mayPost = useSelector(userCapabilitiesSelect.allows)(
    importCCTxnCapabilities.can.expensePostings.write,
  );
  const { postRows, closeBatchPreview } = useImportPost();

  if (!batchPreview) return null;
  const {
    startDate,
    endDate,
    readyRowIds,
    readyCount,
    readyTotalCents,
    deferredCount,
    batchCount,
    unconfirmedCount,
    warnings,
    blockedRows,
    unsettledRowCount,
  } = batchPreview;
  const canPost = readyCount > 0;

  return (
    <AlertDialog open onOpenChange={(open) => !open && closeBatchPreview()}>
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {canPost ? "Post these expenses to QuickBooks?" : "Nothing to post in this range"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {canPost
              ? "This creates real credit card expenses in the live books. Compare the total with your card statement."
              : "Fix the problems below, or choose different dates."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="divide-y divide-border rounded-md border border-border px-3">
          <Line label="Dates" value={`${startDate} to ${endDate}`} />
          <Line label="Expenses to post" value={String(readyCount)} />
          <Line label="Total" value={formatCents(readyTotalCents)} />
          {canPost && <Line label="Sent in" value={`${batchCount} batch${batchCount === 1 ? "" : "es"} of up to 30`} />}
        </dl>

        {unconfirmedCount > 0 && (
          <p className="flex items-start gap-2 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            {unconfirmedCount} of these {unconfirmedCount === 1 ? "has" : "have"} a vendor filled in
            from a similar description that nobody has confirmed. They will post as shown.
          </p>
        )}

        {deferredCount > 0 && (
          <p className="text-sm text-foreground">
            {deferredCount} more ready row{deferredCount === 1 ? "" : "s"} in this range will wait.
            One run posts at most 300. Review the range again afterwards.
          </p>
        )}

        {unsettledRowCount > 0 && (
          <p className="text-sm text-foreground">
            {unsettledRowCount} row{unsettledRowCount === 1 ? " is" : "s are"} unknown or stuck
            posting and not part of this run. Look {unsettledRowCount === 1 ? "it" : "them"} up in
            QuickBooks first.
          </p>
        )}

        {warnings.length > 0 && (
          <ul className="space-y-1 text-sm text-foreground">
            {warnings.map((warning) => (
              <li key={warning.message} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                {warning.count} row{warning.count === 1 ? "" : "s"}: {warning.message}
              </li>
            ))}
          </ul>
        )}

        {blockedRows.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-destructive">
              {blockedRows.length} row{blockedRows.length === 1 ? "" : "s"} will not be posted
            </div>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
              {blockedRows.map((blocked) => (
                <li key={blocked.rowId}>
                  <span className="font-mono text-foreground">{blocked.description}</span>{" "}
                  <span className="text-muted-foreground">
                    {blocked.transactionDate}, {formatCents(blocked.amountCents)}
                  </span>
                  <div className="text-xs text-destructive">{blocked.problems.join(" ")}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{canPost ? "Cancel" : "Close"}</AlertDialogCancel>
          {canPost && (
            <AlertDialogAction disabled={!mayPost} onClick={() => postRows(readyRowIds)}>
              Post {readyCount} expense{readyCount === 1 ? "" : "s"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
