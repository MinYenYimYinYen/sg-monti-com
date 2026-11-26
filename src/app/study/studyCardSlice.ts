import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import type { StudyContract } from "@/app/study/api/StudyContract";
import type { CardScheduleDoc, StudyCardDoc } from "@/app/study/StudyTypes";
import type { MyReviews, StudyDeckSummary } from "@/app/study/StudyApiTypes";
import {
  removeCardDocs,
  replaceDeckCards,
  replaceDeckSchedules,
  upsertCardDocs,
  upsertScheduleDoc,
} from "@/app/study/studyCardState";

// Cards and a student's progress. Pictures are not here: they are base64 strings, so they live in a
// small component-level cache (`useFigure.ts`) and never in the store.

type StudyCardState = {
  /** Every card of the decks the review screen has opened, in all statuses. Admin side. */
  cardDocs: StudyCardDoc[];
  /** Decks with published cards. Student side. */
  deckSummaries: StudyDeckSummary[];
  /** Published cards of the decks a student has opened. Kept apart from `cardDocs`, which holds drafts. */
  publishedCardDocs: StudyCardDoc[];
  scheduleDocs: CardScheduleDoc[];
  recentReviewLogs: MyReviews["recentReviewLogs"];
};

const initialState: StudyCardState = {
  cardDocs: [],
  deckSummaries: [],
  publishedCardDocs: [],
  scheduleDocs: [],
  recentReviewLogs: [],
};

const API_PATH = "/study/api";

function studyThunk<Op extends keyof StudyContract & string>(op: Op) {
  return createStandardThunk<StudyContract, Op>({ typePrefix: `study/${op}`, apiPath: API_PATH, opName: op });
}

// Gated by `studyCardAdmin` on the server.
export const getCards = studyThunk("getCards");
export const editCard = studyThunk("editCard");
export const acceptImageIdeas = studyThunk("acceptImageIdeas");
export const publishCards = studyThunk("publishCards");
export const unpublishCards = studyThunk("unpublishCards");
export const deleteCards = studyThunk("deleteCards");
export const attachFigure = studyThunk("attachFigure");
export const removeFigure = studyThunk("removeFigure");

// Gated by `studyCardStudent` on the server.
export const getStudyDecks = studyThunk("getStudyDecks");
export const getPublishedCards = studyThunk("getPublishedCards");
export const getMyReviews = studyThunk("getMyReviews");
export const submitReview = studyThunk("submitReview");

const studyCardSlice = createSlice({
  name: "studyCard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCards.fulfilled, (state, action) => {
      state.cardDocs = replaceDeckCards({
        cardDocs: state.cardDocs,
        deckKey: action.meta.arg.params.deckKey,
        incoming: action.payload,
      });
    });
    builder.addCase(editCard.fulfilled, (state, action) => {
      state.cardDocs = upsertCardDocs({ cardDocs: state.cardDocs, updated: [action.payload] });
    });
    // Status changes come back with the cards as they now are, so state never guesses.
    for (const thunk of [acceptImageIdeas, publishCards, unpublishCards]) {
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.cardDocs = upsertCardDocs({ cardDocs: state.cardDocs, updated: action.payload.cards });
      });
    }
    builder.addCase(deleteCards.fulfilled, (state, action) => {
      state.cardDocs = removeCardDocs({ cardDocs: state.cardDocs, cardKeys: action.payload.deletedCardKeys });
    });
    for (const thunk of [attachFigure, removeFigure]) {
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.cardDocs = upsertCardDocs({ cardDocs: state.cardDocs, updated: [action.payload.card] });
      });
    }

    builder.addCase(getStudyDecks.fulfilled, (state, action) => {
      state.deckSummaries = action.payload;
    });
    builder.addCase(getPublishedCards.fulfilled, (state, action) => {
      state.publishedCardDocs = replaceDeckCards({
        cardDocs: state.publishedCardDocs,
        deckKey: action.meta.arg.params.deckKey,
        incoming: action.payload,
      });
    });
    builder.addCase(getMyReviews.fulfilled, (state, action) => {
      state.scheduleDocs = replaceDeckSchedules({
        scheduleDocs: state.scheduleDocs,
        deckKey: action.meta.arg.params.deckKey,
        incoming: action.payload.schedules,
      });
      state.recentReviewLogs = action.payload.recentReviewLogs;
    });
    builder.addCase(submitReview.fulfilled, (state, action) => {
      const { schedule, reviewLog } = action.payload;
      state.scheduleDocs = upsertScheduleDoc({ scheduleDocs: state.scheduleDocs, updated: schedule });
      state.recentReviewLogs = [
        ...state.recentReviewLogs,
        { cardKey: reviewLog.cardKey, reviewedAt: reviewLog.reviewedAt, phaseBefore: reviewLog.phaseBefore },
      ];
    });
  },
});

export const studyCardActions = {
  getCards,
  editCard,
  acceptImageIdeas,
  publishCards,
  unpublishCards,
  deleteCards,
  attachFigure,
  removeFigure,
  getStudyDecks,
  getPublishedCards,
  getMyReviews,
  submitReview,
};

export const studyCardReducer = studyCardSlice.reducer;
