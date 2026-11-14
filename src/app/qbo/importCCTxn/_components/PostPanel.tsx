"use client";

import { useSelector } from "react-redux";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { PostRowLine } from "@/app/qbo/importCCTxn/_components/PostRowLine";
import { PostConfirmDialog } from "@/app/qbo/importCCTxn/_components/PostConfirmDialog";
import { BatchPostCard } from "@/app/qbo/importCCTxn/_components/BatchPostCard";
import { BatchConfirmDialog } from "@/app/qbo/importCCTxn/_components/BatchConfirmDialog";
import { PostRunResults } from "@/app/qbo/importCCTxn/_components/PostRunResults";
import { SkippedRowsSection } from "@/app/qbo/importCCTxn/_components/SkippedRowsSection";

// The preview is the read: it asks QuickBooks what a post would do and sends nothing. The Post
// buttons inside need `expensePostings.write` on top (see PostConfirmDialog and BatchConfirmDialog).
export function PostPanel() {
  return (
    <GatedPanel requirement={can.ccExpensePlans.read}>
      <PostWorkspace />
    </GatedPanel>
  );
}

function PostWorkspace() {
  const postableRows = useSelector(importRowSelect.postableRows);
  const unknownRows = useSelector(importRowSelect.unknownRows);

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
