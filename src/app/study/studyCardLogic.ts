import type { StudyCardDoc } from "@/app/study/StudyTypes";

/** An accepted image card that is still waiting for its picture. Derived, so it cannot drift from `imageKey`. */
export function needsImage(card: Pick<StudyCardDoc, "kind" | "status" | "imageKey">): boolean {
  return card.kind === "image" && card.status === "draft" && card.imageKey === null;
}

/**
 * Why a card cannot be published, or null when it can. The server uses the same function, so the
 * review screen and the `publishCards` op never disagree.
 */
export function getPublishBlocker(card: Pick<StudyCardDoc, "kind" | "status" | "imageKey">): string | null {
  if (card.status === "published") return "Already published.";
  if (card.status === "proposed") return "Accept this image proposal first.";
  if (card.kind === "image" && card.imageKey === null) return "Attach an image first.";
  return null;
}
