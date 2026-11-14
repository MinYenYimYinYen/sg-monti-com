"use client";

import { useSelector } from "react-redux";
import { CheckCircle2 } from "lucide-react";
import { CSVDropzone } from "@/components/dropZone/dropZone";
import { Button } from "@/style/components/button";
import { Notice } from "@/app/permission/_components/Notice";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { importCCTxnSelect } from "@/app/qbo/importCCTxn/importCCTxnSelect";
import { useImportRow } from "@/app/qbo/importCCTxn/rows/useImportRow";
import { ImportParseErrors } from "@/app/qbo/importCCTxn/_components/ImportParseErrors";
import { ImportPreviewSummary } from "@/app/qbo/importCCTxn/_components/ImportPreviewSummary";
import { CardAssignmentRow } from "@/app/qbo/importCCTxn/_components/CardAssignmentRow";

function CommitResultNotice() {
  const lastCommit = useSelector(importRowSelect.lastCommit);
  if (!lastCommit) return null;

  const skippedCount = lastCommit.insertedRows.filter((row) => row.status === "skipped").length;
  const pendingCount = lastCommit.insertedRows.length - skippedCount;

  return (
    <div className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-4">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <div className="text-sm text-foreground">
        Imported {lastCommit.insertedRows.length} transaction
        {lastCommit.insertedRows.length === 1 ? "" : "s"}: {pendingCount} ready to map and post,{" "}
        {skippedCount} skipped. {lastCommit.duplicateCount} already imported earlier.
      </div>
    </div>
  );
}

export function ImportPanel() {
  const file = useSelector(importRowSelect.file);
  const parsedRows = useSelector(importCCTxnSelect.parsedRows);
  const fileCards = useSelector(importCCTxnSelect.fileCards);
  const unassignedCards = useSelector(importCCTxnSelect.unassignedCards);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canImport = allows(can.ccImportRows.write);
  const canCommit = useSelector(importCCTxnSelect.canCommit) && canImport;
  const confirmedDuplicateRowNumbers = useSelector(importRowSelect.confirmedDuplicateRowNumbers);
  // The layout already loads the data. autoLoad is off here so this only supplies actions.
  const { loadFile, commit, reset } = useImportRow({ autoLoad: false });

  const handleCommit = () => {
    if (file.stage !== "parsed") return;
    commit({
      rows: parsedRows,
      fileName: file.fileName,
      duplicateRowNumbers: confirmedDuplicateRowNumbers,
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <CommitResultNotice />

        {file.stage === "idle" &&
          (canImport ? (
            <CSVDropzone className="h-40" onFileDrop={loadFile} />
          ) : (
            // The dropzone has no disabled state, and a dropped file asks the server to preview it.
            <Notice>You can view the imported transactions, but you cannot import a file.</Notice>
          ))}

        {file.stage === "errors" && (
          <>
            <ImportParseErrors fileName={file.fileName} errors={file.errors} />
            <Button variant="primary" intensity="soft" onClick={reset}>
              Choose another file
            </Button>
          </>
        )}

        {file.stage === "parsed" && (
          <div className="space-y-6">
            <div className="text-sm text-foreground">
              <span className="font-semibold">{file.fileName}</span>
              <span className="text-muted-foreground"> is a {file.formatLabel} export.</span>
            </div>

            {unassignedCards.length > 0 && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Assign a responsible user to each new card
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The import is blocked until every card in the file has one.
                  </p>
                </div>
                {unassignedCards.map((card) => (
                  <CardAssignmentRow
                    key={`${card.formatId}:${card.last4}`}
                    formatId={card.formatId}
                    last4={card.last4}
                    rowCount={card.rowCount}
                  />
                ))}
              </div>
            )}

            <ImportPreviewSummary />

            <div className="flex items-center gap-3">
              <Button variant="primary" disabled={!canCommit} onClick={handleCommit}>
                Import
              </Button>
              <Button variant="primary" intensity="soft" onClick={reset}>
                Cancel
              </Button>
              {fileCards.length > 0 && unassignedCards.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  {fileCards.length} card{fileCards.length === 1 ? "" : "s"} assigned.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
