import type { CardScheduleDoc, StudyCardDoc } from "@/app/study/StudyTypes";

// Pure state helpers for cards and schedules. No store, no clock.

/** Replaces cards with the same key, or adds them. Keeps reading order. */
export function upsertCardDocs({
  cardDocs,
  updated,
}: {
  cardDocs: StudyCardDoc[];
  updated: StudyCardDoc[];
}): StudyCardDoc[] {
  if (updated.length === 0) return cardDocs;
  const cardsByKey = new Map(cardDocs.map((doc) => [doc.cardKey, doc]));
  for (const doc of updated) cardsByKey.set(doc.cardKey, doc);
  return [...cardsByKey.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** A deck's cards are loaded whole, so they replace what state held for that deck. */
export function replaceDeckCards({
  cardDocs,
  deckKey,
  incoming,
}: {
  cardDocs: StudyCardDoc[];
  deckKey: string;
  incoming: StudyCardDoc[];
}): StudyCardDoc[] {
  return [...cardDocs.filter((doc) => doc.deckKey !== deckKey), ...incoming].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function removeCardDocs({ cardDocs, cardKeys }: { cardDocs: StudyCardDoc[]; cardKeys: string[] }): StudyCardDoc[] {
  const removed = new Set(cardKeys);
  return cardDocs.filter((doc) => !removed.has(doc.cardKey));
}

export function upsertScheduleDoc({
  scheduleDocs,
  updated,
}: {
  scheduleDocs: CardScheduleDoc[];
  updated: CardScheduleDoc;
}): CardScheduleDoc[] {
  if (!scheduleDocs.some((doc) => doc.cardKey === updated.cardKey)) return [...scheduleDocs, updated];
  return scheduleDocs.map((doc) => (doc.cardKey === updated.cardKey ? updated : doc));
}

export function replaceDeckSchedules({
  scheduleDocs,
  deckKey,
  incoming,
}: {
  scheduleDocs: CardScheduleDoc[];
  deckKey: string;
  incoming: CardScheduleDoc[];
}): CardScheduleDoc[] {
  return [...scheduleDocs.filter((doc) => doc.deckKey !== deckKey), ...incoming];
}

/** What the review screen counts: how many cards of a deck sit in each state. */
export type DeckCardCounts = {
  proposed: number;
  needsPicture: number;
  draft: number;
  published: number;
};

export function countDeckCards(cards: StudyCardDoc[]): DeckCardCounts {
  const counts: DeckCardCounts = { proposed: 0, needsPicture: 0, draft: 0, published: 0 };
  for (const card of cards) {
    if (card.status === "proposed") counts.proposed += 1;
    else if (card.status === "published") counts.published += 1;
    else if (card.kind === "image" && card.imageKey === null) counts.needsPicture += 1;
    else counts.draft += 1;
  }
  return counts;
}
