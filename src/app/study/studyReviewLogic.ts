import type { StudyCardDoc } from "@/app/study/StudyTypes";
import { getPublishBlocker } from "@/app/study/studyCardLogic";

// Which cards each tab of the review screen shows, and what each tab's bulk actions may touch. Pure.

export type ReviewTab = "ideas" | "needsPicture" | "drafts" | "published";

export const REVIEW_TABS: { tab: ReviewTab; label: string }[] = [
  { tab: "ideas", label: "Picture ideas" },
  { tab: "needsPicture", label: "Needs a picture" },
  { tab: "drafts", label: "Drafts" },
  { tab: "published", label: "Published" },
];

export function parseReviewTab(value: string): ReviewTab {
  return REVIEW_TABS.find((entry) => entry.tab === value)?.tab ?? "drafts";
}

export function cardsForTab({ cards, tab }: { cards: StudyCardDoc[]; tab: ReviewTab }): StudyCardDoc[] {
  switch (tab) {
    case "ideas":
      return cards.filter((card) => card.status === "proposed");
    case "needsPicture":
      return cards.filter((card) => card.kind === "image" && card.status === "draft" && card.imageKey === null);
    case "drafts":
      // Picture cards still waiting for their picture have their own tab, so they are not repeated here.
      return cards.filter((card) => card.status === "draft" && !(card.kind === "image" && card.imageKey === null));
    case "published":
      return cards.filter((card) => card.status === "published");
  }
}

/** Cards of the tab that can be published now, in the order shown. Others are listed with why not. */
export function splitPublishable(cards: StudyCardDoc[]): {
  publishableKeys: string[];
  blocked: { cardKey: string; reason: string }[];
} {
  const publishableKeys: string[] = [];
  const blocked: { cardKey: string; reason: string }[] = [];
  for (const card of cards) {
    const reason = getPublishBlocker(card);
    if (reason === null) publishableKeys.push(card.cardKey);
    else blocked.push({ cardKey: card.cardKey, reason });
  }
  return { publishableKeys, blocked };
}

/** Keeps a selection to cards that are still on screen, so a stale tick never reaches an action. */
export function pruneSelection({ selected, visible }: { selected: ReadonlySet<string>; visible: StudyCardDoc[] }): string[] {
  const visibleKeys = new Set(visible.map((card) => card.cardKey));
  return [...selected].filter((cardKey) => visibleKeys.has(cardKey));
}
