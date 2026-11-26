import type { AppDispatch, AppState } from "@/store";
import { handleError } from "@/lib/errors/errorHandler";
import { bytesToBase64, type OpenedPdf } from "@/app/study/pdfChunker";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import { generateCardsViaApi } from "@/app/study/studyClient";
import { getRunnableChunks, type RunOutcome } from "@/app/study/studyImportLogic";
import { studyActions } from "@/app/study/studySlice";
import { studySelect } from "@/app/study/studySelect";

/**
 * Sends the import's runnable sections one at a time. A section that fails is recorded by the server
 * and the run carries on to the next, unless several fail in a row (the cause is probably shared,
 * such as no credit or a bad key). A stop request is honored between sections: the one being read is
 * already paid for, so it is allowed to finish.
 */
export async function runImportSections({
  importId,
  pdf,
  dispatch,
  getState,
}: {
  importId: string;
  pdf: OpenedPdf;
  dispatch: AppDispatch;
  getState: () => AppState;
}): Promise<RunOutcome> {
  const config = STUDY_CONFIG.generation;
  const outcome: RunOutcome = { attemptedCount: 0, failedCount: 0, stoppedReason: "finished", errorMessage: null };
  // A section is tried once per run, so a failure moves on instead of retrying forever.
  const attempted = new Set<number>();
  let consecutiveFailures = 0;

  while (true) {
    if (studySelect.importRun(getState()).stopRequested) {
      outcome.stoppedReason = "stoppedByUser";
      break;
    }
    const studyImport = studySelect.importDocsById(getState()).get(importId);
    if (!studyImport) {
      outcome.stoppedReason = "error";
      outcome.errorMessage = "The import is no longer available.";
      break;
    }
    const next = getRunnableChunks({ studyImport, now: new Date(), config }).find(
      (chunk) => !attempted.has(chunk.chunkIndex),
    );
    if (!next) break;

    attempted.add(next.chunkIndex);
    dispatch(studyActions.runProgressed({ currentChunkIndex: next.chunkIndex }));
    try {
      const pdfBytes = await pdf.cutRange({ firstPage: next.firstPage, lastPage: next.lastPage });
      const result = await generateCardsViaApi({
        importId,
        chunkIndex: next.chunkIndex,
        pdfBase64: bytesToBase64(pdfBytes),
      });
      dispatch(studyActions.importUpdated(result.studyImport));
      outcome.attemptedCount += 1;

      const settled = result.studyImport.chunks.find((chunk) => chunk.chunkIndex === next.chunkIndex);
      if (settled?.status === "failed") {
        outcome.failedCount += 1;
        consecutiveFailures += 1;
      } else {
        consecutiveFailures = 0;
      }
    } catch (e) {
      // The request itself failed (network, permission, a refused claim), so it does not count as a section run.
      outcome.stoppedReason = "error";
      outcome.errorMessage = handleError(e).message;
      break;
    }

    if (consecutiveFailures >= config.stopAfterConsecutiveFailures) {
      outcome.stoppedReason = "tooManyFailures";
      break;
    }
  }
  return outcome;
}
