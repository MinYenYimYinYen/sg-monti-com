import { AppError } from "@/lib/errors/AppError";
import { StudyCardModel, StudyImportModel } from "@/app/study/StudyModels";
import type { ImportChunkDoc, StudyImportDoc } from "@/app/study/StudyTypes";
import type { StudyConfig } from "@/app/study/studyConst";

// Server only; the caller has already connected to the database. A chunk is claimed atomically
// before Claude is called, so two requests (a double click, a second tab) never run the same
// section and bill it twice.

function notFound(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 404 });
}

/** Why a chunk could not be claimed, in words for the admin. Run only after a claim has failed. */
export function describeUnclaimable({
  studyImport,
  chunkIndex,
}: {
  studyImport: StudyImportDoc | null;
  chunkIndex: number;
}): string {
  if (studyImport === null) return "This import no longer exists.";
  const chunk = studyImport.chunks.find((candidate) => candidate.chunkIndex === chunkIndex);
  if (!chunk) return `This import has no section ${chunkIndex + 1}.`;
  if (chunk.status === "done") return "This section is already done. Its cards are in the review list.";
  return "This section is being read right now. Wait for it to finish.";
}

/**
 * Marks the chunk as generating, but only if it is pending, failed, or "generating" for so long that
 * its request must have died. Returns the import, or null when someone else holds the chunk.
 */
export async function claimChunk({
  importId,
  chunkIndex,
  now,
  config,
}: {
  importId: string;
  chunkIndex: number;
  now: Date;
  config: StudyConfig;
}): Promise<StudyImportDoc | null> {
  const staleBefore = new Date(now.getTime() - config.generation.staleClaimMs).toISOString();
  return StudyImportModel.findOneAndUpdate(
    {
      importId,
      chunks: {
        $elemMatch: {
          chunkIndex,
          $or: [
            { status: { $in: ["pending", "failed"] } },
            { status: "generating", startedAt: { $lt: staleBefore } },
          ],
        },
      },
    },
    { $set: { "chunks.$.status": "generating", "chunks.$.startedAt": now.toISOString(), "chunks.$.failureMessage": null } },
    { new: true },
  ).lean<StudyImportDoc | null>();
}

/**
 * Records how a chunk ended. Cost adds up across attempts, so a section retried three times shows
 * what it really cost.
 */
export async function settleChunk({
  importId,
  chunkIndex,
  outcome,
}: {
  importId: string;
  chunkIndex: number;
  outcome: {
    status: "done" | "failed";
    failureMessage: string | null;
    cardCount: number;
    proposalCount: number;
    usage: ImportChunkDoc["usage"];
  };
}): Promise<StudyImportDoc> {
  const { status, failureMessage, cardCount, proposalCount, usage } = outcome;
  const settled = await StudyImportModel.findOneAndUpdate(
    { importId },
    {
      $set: {
        "chunks.$[chunk].status": status,
        "chunks.$[chunk].startedAt": null,
        "chunks.$[chunk].failureMessage": failureMessage,
        "chunks.$[chunk].cardCount": cardCount,
        "chunks.$[chunk].proposalCount": proposalCount,
      },
      $inc: {
        "chunks.$[chunk].usage.apiCalls": usage.apiCalls,
        "chunks.$[chunk].usage.inputTokens": usage.inputTokens,
        "chunks.$[chunk].usage.outputTokens": usage.outputTokens,
        "chunks.$[chunk].usage.costUsd": usage.costUsd,
      },
    },
    { new: true, arrayFilters: [{ "chunk.chunkIndex": chunkIndex }] },
  ).lean<StudyImportDoc | null>();
  if (!settled) throw notFound("This import no longer exists.");
  return settled;
}

/**
 * Removes drafts and proposals a dead attempt may have left for this chunk before a new attempt
 * saves its own. A finished chunk can never be claimed again, so this never touches cards an admin
 * has been working on, and published cards are never removed.
 */
export async function clearUnfinishedCards({
  importId,
  chunkIndex,
}: {
  importId: string;
  chunkIndex: number;
}): Promise<void> {
  await StudyCardModel.deleteMany({
    importId,
    importChunkIndex: chunkIndex,
    status: { $in: ["draft", "proposed"] },
  });
}
