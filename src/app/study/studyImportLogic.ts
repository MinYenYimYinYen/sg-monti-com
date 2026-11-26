import type { PlanImportParams } from "@/app/study/StudyApiTypes";
import type { ImportChunkDoc, StudyImportDoc } from "@/app/study/StudyTypes";
import type { StudyConfig } from "@/app/study/studyConst";
import type { ChunkPlan } from "@/app/study/studyChunkPlan";

// Pure helpers for importing a PDF: what can run, whether a file matches an import, totals, and
// how state changes. No store, no clock (callers pass `now`), no browser.

export function buildPlanParams({
  deckKey,
  fileName,
  pageCount,
  plan,
}: {
  deckKey: string;
  fileName: string;
  pageCount: number;
  plan: ChunkPlan;
}): PlanImportParams {
  return {
    deckKey,
    fileName,
    pageCount,
    chunks: plan.chunks.map(({ firstPage, lastPage, ownFirstPage }) => ({ firstPage, lastPage, ownFirstPage })),
    skippedPages: plan.oversizedPages,
  };
}

/**
 * Sections that can be sent now: pending or failed, plus one stuck in "generating" for so long that
 * its request must have died (the server accepts a claim on it again at the same point).
 */
export function getRunnableChunks({
  studyImport,
  now,
  config,
}: {
  studyImport: StudyImportDoc;
  now: Date;
  config: StudyConfig["generation"];
}): ImportChunkDoc[] {
  const staleBefore = now.getTime() - config.staleClaimMs;
  return studyImport.chunks.filter((chunk) => {
    if (chunk.status === "pending" || chunk.status === "failed") return true;
    if (chunk.status !== "generating" || chunk.startedAt === null) return false;
    return new Date(chunk.startedAt).getTime() < staleBefore;
  });
}

/**
 * Why a chosen file cannot continue this import, or null. The file is never stored, so this is the
 * only guard against resuming with the wrong document and filing its cards under the wrong pages.
 */
export function checkResumeFile({
  studyImport,
  fileName,
  pageCount,
}: {
  studyImport: StudyImportDoc;
  fileName: string;
  pageCount: number;
}): string | null {
  if (pageCount !== studyImport.pageCount) {
    return `This import was made from a ${studyImport.pageCount} page file, and the one you chose has ${pageCount}.`;
  }
  if (fileName !== studyImport.fileName) {
    return `This import was made from "${studyImport.fileName}", not "${fileName}". Choose the same file.`;
  }
  return null;
}

export type ImportSummary = {
  chunkCount: number;
  doneCount: number;
  failedCount: number;
  pendingCount: number;
  generatingCount: number;
  textCardCount: number;
  imageProposalCount: number;
  costUsd: number;
};

export function summarizeImport(studyImport: StudyImportDoc): ImportSummary {
  const countOf = (status: ImportChunkDoc["status"]) =>
    studyImport.chunks.filter((chunk) => chunk.status === status).length;
  return {
    chunkCount: studyImport.chunks.length,
    doneCount: countOf("done"),
    failedCount: countOf("failed"),
    pendingCount: countOf("pending"),
    generatingCount: countOf("generating"),
    textCardCount: studyImport.chunks.reduce((total, chunk) => total + chunk.cardCount, 0),
    imageProposalCount: studyImport.chunks.reduce((total, chunk) => total + chunk.proposalCount, 0),
    costUsd: studyImport.chunks.reduce((total, chunk) => total + chunk.usage.costUsd, 0),
  };
}

/** Replaces the import with the same id, or adds it. */
export function upsertImportDoc({
  importDocs,
  updated,
}: {
  importDocs: StudyImportDoc[];
  updated: StudyImportDoc;
}): StudyImportDoc[] {
  if (!importDocs.some((doc) => doc.importId === updated.importId)) return [...importDocs, updated];
  return importDocs.map((doc) => (doc.importId === updated.importId ? updated : doc));
}

/** A deck's imports are loaded whole, so they replace what state held for that deck. */
export function replaceDeckImports({
  importDocs,
  deckKey,
  incoming,
}: {
  importDocs: StudyImportDoc[];
  deckKey: string;
  incoming: StudyImportDoc[];
}): StudyImportDoc[] {
  return [...importDocs.filter((doc) => doc.deckKey !== deckKey), ...incoming];
}

/** The one import that may run at a time. Lives in the store so a run survives navigating away. */
export type ImportRunState = {
  status: "idle" | "planning" | "running";
  importId: string | null;
  /** The section being read now. Null between sections and while planning. */
  currentChunkIndex: number | null;
  /** Checked between sections. The section being read is allowed to finish, since it is already paid for. */
  stopRequested: boolean;
  /** How the last run ended, in words for the admin. */
  message: string | null;
};

export const IDLE_IMPORT_RUN: ImportRunState = {
  status: "idle",
  importId: null,
  currentChunkIndex: null,
  stopRequested: false,
  message: null,
};

export type RunOutcome = {
  attemptedCount: number;
  failedCount: number;
  stoppedReason: "finished" | "stoppedByUser" | "tooManyFailures" | "error";
  errorMessage: string | null;
};

export function describeRunOutcome(outcome: RunOutcome): string {
  const { attemptedCount, failedCount, stoppedReason, errorMessage } = outcome;
  const sections = `${attemptedCount} ${attemptedCount === 1 ? "section" : "sections"}`;
  if (stoppedReason === "error") return `Stopped after ${sections}: ${errorMessage ?? "something went wrong."}`;
  if (stoppedReason === "stoppedByUser") return `Stopped after ${sections}. Run again to continue where it left off.`;
  if (stoppedReason === "tooManyFailures") {
    return `Stopped after ${sections} because sections kept failing. Check the reasons below, then run again.`;
  }
  if (failedCount > 0) return `Finished ${sections}, but ${failedCount} failed. Run again to retry only those.`;
  return `Finished ${sections}.`;
}
