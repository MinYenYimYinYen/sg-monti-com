import { AppError } from "@/lib/errors/AppError";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { StudyCardModel, StudyImageModel } from "@/app/study/StudyModels";
import type { StudyCardDoc } from "@/app/study/StudyTypes";

// Server only; the caller has already connected to the database.

export function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

/** The named cards that exist, by key. A key with no card is simply missing from the map. */
export async function loadCardsByKey(cardKeys: string[]): Promise<Map<string, StudyCardDoc>> {
  const docs = await StudyCardModel.find({ cardKey: { $in: cardKeys } }).lean();
  return new Map(cleanMongoArray(docs).map((doc) => [doc.cardKey, doc as StudyCardDoc]));
}

export async function loadCardsInOrder(cardKeys: string[]): Promise<StudyCardDoc[]> {
  const docs = await StudyCardModel.find({ cardKey: { $in: cardKeys } }).sort({ sortOrder: 1 }).lean();
  return cleanMongoArray(docs) as StudyCardDoc[];
}

/**
 * Deletes a picture nobody uses any more. Several cards in a deck can share one stored picture (the
 * same bytes are stored once), so it goes only when no card still points at it. Run after the card
 * that held it has changed, never before.
 */
export async function deleteImageIfUnused(imageKey: string | null): Promise<void> {
  if (imageKey === null) return;
  const stillUsed = await StudyCardModel.exists({ imageKey });
  if (!stillUsed) await StudyImageModel.deleteOne({ imageKey });
}
