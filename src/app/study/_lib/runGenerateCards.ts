import { AppError } from "@/lib/errors/AppError";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { generateChunkCards, saveGeneratedCards } from "@/app/study/_lib/generateChunkServer";
import { claimChunk, clearUnfinishedCards, describeUnclaimable, settleChunk } from "@/app/study/_lib/importChunkServer";
import { StudyDeckModel, StudyImportModel } from "@/app/study/StudyModels";
import type { GenerateCardsParams, GenerateCardsResult } from "@/app/study/StudyApiTypes";
import type { StudyImportDoc } from "@/app/study/StudyTypes";
import type { StudyConfig } from "@/app/study/studyConst";

// Server only; the caller has already connected to the database and checked the capability.

const NO_USAGE = { apiCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

/**
 * Claims the section, has Claude read it, and saves what came back. A section that fails is still a
 * normal result: it comes back marked failed with what it cost, so the admin can retry it. Anything
 * unexpected past the claim marks the section failed too, so it is never left stuck as "generating".
 */
export async function runGenerateCards({
  params,
  config,
}: {
  params: GenerateCardsParams;
  config: StudyConfig;
}): Promise<GenerateCardsResult> {
  const { importId, chunkIndex, pdfBase64 } = params;

  const claimed = await claimChunk({ importId, chunkIndex, now: new Date(), config });
  if (!claimed) {
    const current = await StudyImportModel.findOne({ importId }).lean<StudyImportDoc | null>();
    throw validationError(describeUnclaimable({ studyImport: current, chunkIndex }));
  }
  const chunk = claimed.chunks.find((candidate) => candidate.chunkIndex === chunkIndex)!;

  try {
    const deck = await StudyDeckModel.findOne({ deckKey: claimed.deckKey }).lean();
    // Thrown on purpose: the catch below marks the section failed, so it is not left "generating".
    if (!deck) throw validationError("The deck for this import no longer exists.");

    const generated = await generateChunkCards({
      chunk,
      deckKey: claimed.deckKey,
      deckTitle: deck.title,
      importId,
      fileName: claimed.fileName,
      pdfBase64,
      config,
    });

    const succeeded = generated.failureMessage === null;
    const proposalCount = succeeded ? generated.cards.filter((card) => card.kind === "image").length : 0;
    const textCardCount = succeeded ? generated.cards.length - proposalCount : 0;
    if (succeeded) {
      await clearUnfinishedCards({ importId, chunkIndex });
      await saveGeneratedCards(generated.cards);
    }

    const studyImport = await settleChunk({
      importId,
      chunkIndex,
      outcome: {
        status: succeeded ? "done" : "failed",
        failureMessage: generated.failureMessage,
        cardCount: textCardCount,
        proposalCount,
        usage: generated.usage,
      },
    });
    console.info(
      `[Study] import ${importId} section ${chunkIndex + 1}: ${generated.failureMessage ?? `${generated.cards.length} items`}, $${generated.usage.costUsd.toFixed(4)}`,
    );
    return { studyImport: cleanMongoObject(studyImport), textCardsAdded: textCardCount, imageProposalsAdded: proposalCount };
  } catch (e) {
    // The cost of a run that failed while saving is not known here, so it is not counted.
    await settleChunk({
      importId,
      chunkIndex,
      outcome: {
        status: "failed",
        failureMessage: e instanceof AppError ? e.message : "These pages could not be saved. Try this section again.",
        cardCount: 0,
        proposalCount: 0,
        usage: NO_USAGE,
      },
    }).catch((settleError) => console.error("[Study] could not mark the section failed", settleError));
    throw e;
  }
}
