import type { CardRefusal } from "@/app/study/StudyApiTypes";
import type { StudyCardDoc } from "@/app/study/StudyTypes";
import { getPublishBlocker } from "@/app/study/studyCardLogic";

// What an admin may do to a card in each state. Pure, so the server ops and the review screen apply
// the same rules and a test can check them without a database. Each function returns the cards that
// may change and a refusal, with a reason, for every one that may not.

type CardState = Pick<StudyCardDoc, "cardKey" | "kind" | "status" | "imageKey">;

export type Partitioned = { allowed: string[]; refused: CardRefusal[] };

function partition({
  cardKeys,
  cardsByKey,
  blockerOf,
}: {
  cardKeys: string[];
  cardsByKey: Map<string, CardState>;
  blockerOf: (card: CardState) => string | null;
}): Partitioned {
  const result: Partitioned = { allowed: [], refused: [] };
  for (const cardKey of cardKeys) {
    const card = cardsByKey.get(cardKey);
    const blocker = card ? blockerOf(card) : "This card no longer exists.";
    if (blocker === null) result.allowed.push(cardKey);
    else result.refused.push({ cardKey, reason: blocker });
  }
  return result;
}

/** Turning an image proposal into a draft the admin will attach a picture to. */
export function partitionAccepts({ cardKeys, cardsByKey }: { cardKeys: string[]; cardsByKey: Map<string, CardState> }) {
  return partition({
    cardKeys,
    cardsByKey,
    blockerOf: (card) => (card.status === "proposed" ? null : "This is not an image idea waiting for a decision."),
  });
}

export function partitionPublishes({ cardKeys, cardsByKey }: { cardKeys: string[]; cardsByKey: Map<string, CardState> }) {
  return partition({ cardKeys, cardsByKey, blockerOf: getPublishBlocker });
}

/** Taking a published card back to a draft, so it can be corrected. Students stop seeing it at once. */
export function partitionUnpublishes({ cardKeys, cardsByKey }: { cardKeys: string[]; cardsByKey: Map<string, CardState> }) {
  return partition({
    cardKeys,
    cardsByKey,
    blockerOf: (card) => (card.status === "published" ? null : "This card is not published."),
  });
}

/**
 * Published cards are not deleted: students have review history on them, and deleting would orphan it.
 * Take one back to a draft first if it really has to go.
 */
export function partitionDeletes({ cardKeys, cardsByKey }: { cardKeys: string[]; cardsByKey: Map<string, CardState> }) {
  return partition({
    cardKeys,
    cardsByKey,
    blockerOf: (card) => (card.status === "published" ? "Take this card back to a draft before deleting it." : null),
  });
}

/** Why a card cannot be edited, or null. An edit changes what students study, so a live card is not edited in place. */
export function getEditBlocker(card: Pick<StudyCardDoc, "status">): string | null {
  return card.status === "published" ? "Take this card back to a draft before editing it." : null;
}

/** Pictures only belong on image cards the admin has accepted, never on a text card or a bare proposal. */
export function getAttachBlocker(card: Pick<StudyCardDoc, "kind" | "status">): string | null {
  if (card.kind !== "image") return "Only picture cards hold a picture.";
  if (card.status === "proposed") return "Accept this picture idea before attaching a picture.";
  if (card.status === "published") return "Take this card back to a draft before changing its picture.";
  return null;
}
