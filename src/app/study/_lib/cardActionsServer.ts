import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { deleteImageIfUnused, loadCardsByKey, loadCardsInOrder, validationError } from "@/app/study/_lib/studyCardServer";
import { StudyCardModel } from "@/app/study/StudyModels";
import type { CardChangeResult, CardEdit, DeleteCardsResult } from "@/app/study/StudyApiTypes";
import type { CardStatus, StudyCardDoc } from "@/app/study/StudyTypes";
import {
  getEditBlocker,
  partitionAccepts,
  partitionDeletes,
  partitionPublishes,
  partitionUnpublishes,
  type Partitioned,
} from "@/app/study/studyCardRules";

// Server only; the caller has already connected to the database. Every change re-states the status it
// expects in the filter, so a card another admin changed in between is left alone, not overwritten.

async function moveCards({
  allowed,
  from,
  to,
}: {
  allowed: string[];
  from: CardStatus;
  to: CardStatus;
}): Promise<void> {
  if (allowed.length === 0) return;
  await StudyCardModel.updateMany({ cardKey: { $in: allowed }, status: from }, { $set: { status: to } });
}

async function changeStatus({
  cardKeys,
  partition,
  from,
  to,
}: {
  cardKeys: string[];
  partition: (params: { cardKeys: string[]; cardsByKey: Map<string, StudyCardDoc> }) => Partitioned;
  from: CardStatus;
  to: CardStatus;
}): Promise<CardChangeResult> {
  const cardsByKey = await loadCardsByKey(cardKeys);
  const { allowed, refused } = partition({ cardKeys, cardsByKey });
  await moveCards({ allowed, from, to });
  return { cards: await loadCardsInOrder(cardKeys), refused };
}

export const acceptImageIdeas = (cardKeys: string[]) =>
  changeStatus({ cardKeys, partition: partitionAccepts, from: "proposed", to: "draft" });

export const publishCards = (cardKeys: string[]) =>
  changeStatus({ cardKeys, partition: partitionPublishes, from: "draft", to: "published" });

export const unpublishCards = (cardKeys: string[]) =>
  changeStatus({ cardKeys, partition: partitionUnpublishes, from: "published", to: "draft" });

/** Deletes drafts and proposals only. A picture left without a card goes with it. */
export async function deleteCards(cardKeys: string[]): Promise<DeleteCardsResult> {
  const cardsByKey = await loadCardsByKey(cardKeys);
  const { allowed, refused } = partitionDeletes({ cardKeys, cardsByKey });

  if (allowed.length > 0) {
    await StudyCardModel.deleteMany({ cardKey: { $in: allowed }, status: { $in: ["proposed", "draft"] } });
    const imageKeys = new Set(allowed.map((cardKey) => cardsByKey.get(cardKey)?.imageKey ?? null));
    for (const imageKey of imageKeys) await deleteImageIfUnused(imageKey);
  }
  return { deletedCardKeys: allowed, refused };
}

export async function editCard({ cardKey, edit }: { cardKey: string; edit: CardEdit }): Promise<StudyCardDoc> {
  const card = await StudyCardModel.findOne({ cardKey }).lean();
  if (!card) throw validationError("That card no longer exists.");
  const blocker = getEditBlocker(card);
  if (blocker !== null) throw validationError(blocker);

  // A text card has no picture to find, and an image card needs its hint to say what to look for.
  const imageHint = card.kind === "image" ? edit.imageHint : null;
  const updated = await StudyCardModel.findOneAndUpdate(
    { cardKey, status: { $in: ["proposed", "draft"] } },
    { $set: { prompt: edit.prompt, answer: edit.answer, note: edit.note, tags: edit.tags, imageHint } },
    { new: true },
  ).lean();
  if (!updated) throw validationError("This card changed while you were editing. Reload and try again.");
  return cleanMongoObject(updated) as StudyCardDoc;
}

/** Every card of a deck in every status, in reading order, for the review screen. */
export async function loadDeckCards(deckKey: string): Promise<StudyCardDoc[]> {
  const docs = await StudyCardModel.find({ deckKey }).sort({ sortOrder: 1 }).lean();
  return cleanMongoArray(docs) as StudyCardDoc[];
}

/** Only what students may see. Drafts and picture ideas never leave the admin side. */
export async function loadPublishedCards(deckKey: string): Promise<StudyCardDoc[]> {
  const docs = await StudyCardModel.find({ deckKey, status: "published" }).sort({ sortOrder: 1 }).lean();
  return cleanMongoArray(docs) as StudyCardDoc[];
}
