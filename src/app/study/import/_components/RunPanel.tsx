"use client";

import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Notice } from "@/app/permission/_components/Notice";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { studySelect } from "@/app/study/studySelect";
import { useStudyImport } from "@/app/study/useStudyImport";

/** Choosing the PDF, starting a run, and watching or stopping one. */
export function RunPanel({
  deckKey,
  file,
  onFileChangeAction,
}: {
  deckKey: string | null;
  file: File | null;
  onFileChangeAction: (file: File | null) => void;
}) {
  const { startImport, stopImport, clearRunMessage } = useStudyImport();
  const importRun = useSelector(studySelect.importRun);
  const summariesById = useSelector(studySelect.importSummariesById);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.studyCardAdmin.write);

  const isBusy = importRun.status !== "idle";
  const summary = importRun.importId === null ? undefined : summariesById.get(importRun.importId);
  const canStart = canWrite && !isBusy && deckKey !== null && file !== null;

  function describeProgress(): string {
    if (importRun.status === "planning") return "Reading the file and planning the sections...";
    if (importRun.currentChunkIndex === null || !summary) return "Working...";
    return `Reading section ${importRun.currentChunkIndex + 1} of ${summary.chunkCount}. ${summary.doneCount} done so far.`;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="study-pdf">PDF file</Label>
        <Input
          id="study-pdf"
          type="file"
          accept="application/pdf,.pdf"
          className="max-w-md"
          disabled={isBusy}
          onChange={(event) => onFileChangeAction(event.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">
          The file is cut into small sections in this browser and read one section at a time. It is not stored, so keep
          this tab open while it runs. Every section is billed to the Anthropic account.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          disabled={!canStart}
          onClick={() => {
            if (deckKey !== null && file !== null) startImport({ deckKey, file });
          }}
        >
          Start a new import
        </Button>
        {isBusy && (
          <Button variant="destructive" intensity="soft" disabled={importRun.stopRequested} onClick={stopImport}>
            {importRun.stopRequested ? "Stopping after this section..." : "Stop"}
          </Button>
        )}
        {isBusy && <span className="text-sm text-muted-foreground">{describeProgress()}</span>}
      </div>

      {!isBusy && importRun.message !== null && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Notice>{importRun.message}</Notice>
          </div>
          <Button variant="primary" intensity="ghost" size="sm" onClick={clearRunMessage}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
