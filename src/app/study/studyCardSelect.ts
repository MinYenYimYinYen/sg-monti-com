import { createSelector } from "@reduxjs/toolkit";
import type { AppState } from "@/store";
import type { StudyCardDoc } from "@/app/study/StudyTypes";
import { countDeckCards } from "@/app/study/studyCardState";
import { needsImage } from "@/app/study/studyCardLogic";

const selectCardDocs = (state: AppState) => state.studyCard.cardDocs;
const selectPublishedCardDocs = (state: AppState) => state.studyCard.publishedCardDocs;
const selectScheduleDocs = (state: AppState) => state.studyCard.scheduleDocs;
const selectRecentReviewLogs = (state: AppState) => state.studyCard.recentReviewLogs;
const selectDeckSummaries = (state: AppState) => state.studyCard.deckSummaries;

function groupByDeckKey(cards: StudyCardDoc[]): Map<string, StudyCardDoc[]> {
  const cardsByDeckKey = new Map<string, StudyCardDoc[]>();
  for (const card of cards) {
    cardsByDeckKey.set(card.deckKey, [...(cardsByDeckKey.get(card.deckKey) ?? []), card]);
  }
  return cardsByDeckKey;
}

/** Admin side: every card of an opened deck, in reading order. */
const selectCardsByDeckKey = createSelector([selectCardDocs], groupByDeckKey);

const selectCardCountsByDeckKey = createSelector([selectCardsByDeckKey], (cardsByDeckKey) => {
  return new Map([...cardsByDeckKey].map(([deckKey, cards]) => [deckKey, countDeckCards(cards)]));
});

/** Admin side: accepted picture cards still waiting for a picture, in reading order. The paste target walks this list. */
const selectNeedsPictureByDeckKey = createSelector([selectCardsByDeckKey], (cardsByDeckKey) => {
  return new Map([...cardsByDeckKey].map(([deckKey, cards]) => [deckKey, cards.filter(needsImage)]));
});

/** Student side: published cards of an opened deck. */
const selectPublishedCardsByDeckKey = createSelector([selectPublishedCardDocs], groupByDeckKey);

export const studyCardSelect = {
  cardsByDeckKey: selectCardsByDeckKey,
  cardCountsByDeckKey: selectCardCountsByDeckKey,
  needsPictureByDeckKey: selectNeedsPictureByDeckKey,
  deckSummaries: selectDeckSummaries,
  publishedCardsByDeckKey: selectPublishedCardsByDeckKey,
  scheduleDocs: selectScheduleDocs,
  recentReviewLogs: selectRecentReviewLogs,
};
