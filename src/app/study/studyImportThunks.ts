import type { AppDispatch, AppThunk } from "@/store";
import { AppError } from "@/lib/errors/AppError";
import { handleError } from "@/lib/errors/errorHandler";
import { openPdf, type OpenedPdf } from "@/app/study/pdfChunker";
import { runImportSections } from "@/app/study/runImportSections";
import { planChunks } from "@/app/study/studyChunkPlan";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import { planImportViaApi } from "@/app/study/studyClient";
import { buildPlanParams, checkResumeFile, describeRunOutcome } from "@/app/study/studyImportLogic";
import { studyActions } from "@/app/study/studySlice";
import { studySelect } from "@/app/study/studySelect";

// Plain thunks rather than `createStandardThunk`, for the reasons in `studySlice.ts`, and because a
// run takes many minutes and must carry on if the admin navigates away. Progress lives in the store
// (`importRun`), so a screen that mounts mid-run shows it. The file stays in memory inside the
// running thunk only: it is never stored, so a page reload ends a run and the admin re-selects the
// same file to resume.

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

/** Reads the file and opens it. Throws a plain-language error for a file that cannot be used. */
async function openChosenFile(file: File): Promise<{ pdf: OpenedPdf; fileName: string }> {
  if (file.size > STUDY_CONFIG.generation.maxSourceFileBytes) {
    const megabytes = Math.round(STUDY_CONFIG.generation.maxSourceFileBytes / (1024 * 1024));
    throw validationError(`This file is too large (${megabytes} MB at most).`);
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw validationError("Choose a PDF file.");
  }
  return { pdf: await openPdf(await file.arrayBuffer()), fileName: file.name };
}

/** Ends the run with a message, for a failure before any section was sent. */
function finishWithError({ dispatch, e }: { dispatch: AppDispatch; e: unknown }) {
  const outcome = {
    attemptedCount: 0,
    failedCount: 0,
    stoppedReason: "error" as const,
    errorMessage: handleError(e).message,
  };
  dispatch(studyActions.runFinished({ message: describeRunOutcome(outcome) }));
}

/** Starts an import from a PDF the admin chose: plans the sections, saves the plan, then reads each section. */
export const startStudyImport =
  ({ deckKey, file }: { deckKey: string; file: File }): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    if (studySelect.importRun(getState()).status !== "idle") return;
    dispatch(studyActions.runStarted({ status: "planning", importId: null }));

    let importId: string;
    let pdf: OpenedPdf;
    try {
      const opened = await openChosenFile(file);
      pdf = opened.pdf;
      const plan = await planChunks({
        pageCount: pdf.pageCount,
        config: STUDY_CONFIG.generation,
        measureBytes: pdf.measureBytes,
      });
      if (plan.chunks.length === 0) {
        // Thrown on purpose: the catch below ends the run with this message.
        throw validationError("No page of this file is small enough to send. Try a different file.");
      }
      const planned = await planImportViaApi(
        buildPlanParams({ deckKey, fileName: opened.fileName, pageCount: pdf.pageCount, plan }),
      );
      importId = planned.importId;
      dispatch(studyActions.importUpdated(planned));
      dispatch(studyActions.runPlanned({ importId }));
    } catch (e) {
      finishWithError({ dispatch, e });
      return;
    }

    const outcome = await runImportSections({ importId, pdf, dispatch, getState });
    dispatch(studyActions.runFinished({ message: describeRunOutcome(outcome) }));
  };

/** Continues an import that stopped: reads only the sections that are not done. The same file must be chosen again. */
export const resumeStudyImport =
  ({ importId, file }: { importId: string; file: File }): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    if (studySelect.importRun(getState()).status !== "idle") return;
    const studyImport = studySelect.importDocsById(getState()).get(importId);
    if (!studyImport) return;
    dispatch(studyActions.runStarted({ status: "running", importId }));

    let pdf: OpenedPdf;
    try {
      const opened = await openChosenFile(file);
      pdf = opened.pdf;
      const mismatch = checkResumeFile({ studyImport, fileName: opened.fileName, pageCount: pdf.pageCount });
      // Thrown on purpose: the catch below ends the run with this message.
      if (mismatch !== null) throw validationError(mismatch);
    } catch (e) {
      finishWithError({ dispatch, e });
      return;
    }

    const outcome = await runImportSections({ importId, pdf, dispatch, getState });
    dispatch(studyActions.runFinished({ message: describeRunOutcome(outcome) }));
  };
