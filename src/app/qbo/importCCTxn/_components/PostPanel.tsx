"use client";

import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { Alert, AlertDescription, AlertTitle } from "@/style/components/alert";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { PostRowLine } from "@/app/qbo/importCCTxn/_components/PostRowLine";
import { PostConfirmDialog } from "@/app/qbo/importCCTxn/_components/PostConfirmDialog";
import { BatchPostCard } from "@/app/qbo/importCCTxn/_components/BatchPostCard";
import { BatchConfirmDialog } from "@/app/qbo/importCCTxn/_components/BatchConfirmDialog";
import { PostRunResults } from "@/app/qbo/importCCTxn/_components/PostRunResults";
import { SkippedRowsSection } from "@/app/qbo/importCCTxn/_components/SkippedRowsSection";

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
          Posting creates real expenses in the live QuickBooks books. Post a whole date range, or
          review a single row below. You see exactly what will be sent before anything is written.
        </p>
        <PostRunResults />
        <BatchPostCard />

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

        <SkippedRowsSection />
      </div>
      <PostConfirmDialog />
      <BatchConfirmDialog />
    </div>
  );
}
