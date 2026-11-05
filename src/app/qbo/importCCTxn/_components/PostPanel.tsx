"use client";

import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { Button } from "@/style/components/button";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { importPostSelect } from "@/app/qbo/importCCTxn/post/importPostSelect";
import { useImportPost } from "@/app/qbo/importCCTxn/post/useImportPost";
import { PostRowLine } from "@/app/qbo/importCCTxn/_components/PostRowLine";
import { PostConfirmDialog } from "@/app/qbo/importCCTxn/_components/PostConfirmDialog";
import { formatCents } from "@/app/qbo/importCCTxn/_lib/importFileUtils";

function LastResults() {
  const lastResults = useSelector(importPostSelect.lastResults);
  const { clearResults } = useImportPost();
  if (lastResults.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border border-border bg-accent/10 p-4">
      {lastResults.map((result) => (
        <div key={result.row.rowId} className="text-sm text-foreground">
          <span className="font-semibold">{result.row.description}</span>{" "}
          {formatCents(result.row.amountCents)}: {result.outcome}
          {result.row.qboPurchaseId && ` (QuickBooks Id ${result.row.qboPurchaseId})`}
          {result.row.postMessage && (
            <div className="text-xs text-muted-foreground">{result.row.postMessage}</div>
          )}
        </div>
      ))}
      <Button variant="primary" intensity="soft" onClick={clearResults}>
        Dismiss
      </Button>
    </div>
  );
}

export function PostPanel() {
  const role = useSelector(authSelect.role);
  const postableRows = useSelector(importRowSelect.postableRows);
  const unknownRows = useSelector(importRowSelect.unknownRows);

  if (role !== "admin") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl p-6">
          <Alert variant="destructive">
            <AlertTitle>Admins only</AlertTitle>
            <AlertDescription>Only an admin can post to QuickBooks.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Posting creates real expenses in the live QuickBooks books, one row at a time for now.
          You see exactly what will be sent before anything is written.
        </p>
        <LastResults />

        {unknownRows.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">
              Check these before posting anything again
            </div>
            {unknownRows.map((row) => (
              <PostRowLine key={row.rowId} rowId={row.rowId} />
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {postableRows.length} row{postableRows.length === 1 ? "" : "s"} ready to review
          </div>
          {postableRows.map((row) => (
            <PostRowLine key={row.rowId} rowId={row.rowId} />
          ))}
        </div>
      </div>
      <PostConfirmDialog />
    </div>
  );
}
