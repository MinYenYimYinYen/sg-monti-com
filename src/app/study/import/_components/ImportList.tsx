"use client";

import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Badge } from "@/style/components/badge";
import { formatUsd } from "@/app/anthropic/anthropicPricing";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import type { ImportChunkDoc, StudyImportDoc } from "@/app/study/StudyTypes";
import { studySelect } from "@/app/study/studySelect";
import { useStudyImport } from "@/app/study/useStudyImport";

function pageRangeLabel(chunk: ImportChunkDoc): string {
  return chunk.ownFirstPage === chunk.lastPage
    ? `page ${chunk.lastPage}`
    : `pages ${chunk.ownFirstPage} to ${chunk.lastPage}`;
}

function StatusBadge({ status }: { status: ImportChunkDoc["status"] }) {
  if (status === "done") return <Badge variant="primary" intensity="soft">Done</Badge>;
  if (status === "failed") return <Badge variant="destructive" intensity="soft">Failed</Badge>;
  if (status === "generating") return <Badge variant="secondary" intensity="soft">Reading</Badge>;
  return <Badge variant="outline">Waiting</Badge>;
}

function ChunkRow({ chunk }: { chunk: ImportChunkDoc }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1 text-sm">
      <span className="w-28 text-foreground">Section {chunk.chunkIndex + 1}</span>
      <StatusBadge status={chunk.status} />
      <span className="text-muted-foreground">{pageRangeLabel(chunk)}</span>
      {chunk.status === "done" && (
        <span className="text-muted-foreground">
          {chunk.cardCount} cards, {chunk.proposalCount} picture ideas
        </span>
      )}
      {chunk.usage.costUsd > 0 && <span className="text-muted-foreground">{formatUsd(chunk.usage.costUsd)}</span>}
      {chunk.failureMessage !== null && <span className="text-destructive">{chunk.failureMessage}</span>}
    </li>
  );
}

function ImportCard({
  studyImport,
  file,
  isBusy,
}: {
  studyImport: StudyImportDoc;
  file: File | null;
  isBusy: boolean;
}) {
  const { resumeImport } = useStudyImport();
  const summaries = useSelector(studySelect.importSummariesById);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const summary = summaries.get(studyImport.importId);
  const canWrite = allows(can.studyCardAdmin.write);

  // Any section not done. The run itself decides which can be claimed (using the clock, in the click
  // handler, not here), and one another tab is still reading is simply skipped.
  const hasWork = studyImport.chunks.some((chunk) => chunk.status !== "done");
  const canResume = canWrite && !isBusy && hasWork && file !== null;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{studyImport.fileName}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(studyImport.createdAt).toLocaleString()} by {studyImport.importedByUserName}, {studyImport.pageCount}{" "}
            pages
          </span>
        </div>
        {hasWork && (
          <Button
            variant="primary"
            intensity="soft"
            size="sm"
            disabled={!canResume}
            title={file === null ? "Choose the same PDF above first." : undefined}
            onClick={() => {
              if (file !== null) resumeImport({ importId: studyImport.importId, file });
            }}
          >
            Resume with the chosen file
          </Button>
        )}
      </div>

      {summary && (
        <p className="text-sm text-muted-foreground">
          {summary.doneCount} of {summary.chunkCount} sections done, {summary.failedCount} failed. {summary.textCardCount}{" "}
          cards and {summary.imageProposalCount} picture ideas so far. Cost about {formatUsd(summary.costUsd)} (estimate).
        </p>
      )}
      {studyImport.skippedPages.length > 0 && (
        <p className="text-sm text-destructive">
          Too large to send, so no cards came from page{studyImport.skippedPages.length === 1 ? "" : "s"}{" "}
          {studyImport.skippedPages.join(", ")}.
        </p>
      )}
      <ul className="divide-y divide-border">
        {studyImport.chunks.map((chunk) => (
          <ChunkRow key={chunk.chunkIndex} chunk={chunk} />
        ))}
      </ul>
    </div>
  );
}

/** A deck's imports, newest first. An import with work left can be resumed with the same file. */
export function ImportList({ deckKey, file }: { deckKey: string; file: File | null }) {
  const importsByDeckKey = useSelector(studySelect.importsByDeckKey);
  const importRun = useSelector(studySelect.importRun);
  const studyImports = importsByDeckKey.get(deckKey) ?? [];

  if (studyImports.length === 0) {
    return <p className="text-sm text-muted-foreground">No imports for this deck yet.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {studyImports.map((studyImport) => (
        <ImportCard
          key={studyImport.importId}
          studyImport={studyImport}
          file={file}
          isBusy={importRun.status !== "idle"}
        />
      ))}
    </div>
  );
}
