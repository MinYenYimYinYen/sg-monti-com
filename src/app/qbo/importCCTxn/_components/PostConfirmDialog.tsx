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
import { can } from "@/permission/can";
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
 * Shows exactly what will be written to the live books and the problems that block it. Opens
 * when the server has returned a preview. Posting is a deliberate second click.
 */
export function PostConfirmDialog() {
  const preview = useSelector(importPostSelect.preview);
  const canPost = useSelector(userCapabilitiesSelect.allows)(
    can.qboExpensePostings.write,
  );
  const { postRow, closePreview } = useImportPost();

  if (!preview) return null;
  const { summary, problems, warnings } = preview;

  return (
    <AlertDialog open onOpenChange={(open) => !open && closePreview()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {summary ? "Post this expense to QuickBooks?" : "This row cannot be posted"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {summary
              ? "This creates a real credit card expense in the live books."
              : "Fix these first, then try again."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {summary && (
          <dl className="divide-y divide-border rounded-md border border-border px-3">
            <Line label="Vendor" value={summary.vendorName} />
            <Line label="Expense account" value={summary.expenseAccountName} />
            <Line label="Card account" value={summary.cardAccountName} />
            <Line label="Date" value={summary.transactionDate} />
            <Line label="Amount" value={formatCents(summary.amountCents)} />
            <Line label="Ref no." value={summary.docNumber} />
          </dl>
        )}

        {problems.length > 0 && (
          <ul className="space-y-1 text-sm text-destructive">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}

        {warnings.length > 0 && (
          <ul className="space-y-1 text-sm text-foreground">
            {warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                {warning}
              </li>
            ))}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{summary ? "Cancel" : "Close"}</AlertDialogCancel>
          {summary && (
            <AlertDialogAction disabled={!canPost} onClick={() => postRow(preview.rowId)}>
              Post
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
