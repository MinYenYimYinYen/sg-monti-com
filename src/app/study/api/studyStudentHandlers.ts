import { can } from "@/permission/can";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { loadPublishedCards } from "@/app/study/_lib/cardActionsServer";
import { loadFigure } from "@/app/study/_lib/figureServer";
import { loadMyReviews, submitReview } from "@/app/study/_lib/reviewServer";
import { validationError } from "@/app/study/_lib/studyCardServer";
import { getCurrentUserName } from "@/app/study/_lib/studyUserServer";
import { StudyCardModel, StudyDeckModel } from "@/app/study/StudyModels";
import type { StudyContract } from "@/app/study/api/StudyContract";
import type { StudyDeckSummary } from "@/app/study/StudyApiTypes";
import { parseDeckKeyParams, parseImageKeyParams, parseSubmitReviewParams } from "@/app/study/studyRequestSchema";
import type { HandlerMap } from "@/lib/api/types/rpcUtils";

type StudentOps = Pick<
  StudyContract,
  "getStudyDecks" | "getPublishedCards" | "getMyReviews" | "submitReview" | "getPublishedFigure"
>;

// Studying: `studyCardStudent`, deliberately separate from `studyCardAdmin`. A student op can only
// ever return published cards, and only the caller's own review state.
export const studyStudentHandlers: HandlerMap<StudentOps> = {
  getStudyDecks: {
    capability: can.studyCardStudent.read,
    handler: async () => {
      await connectToMongoDB();
      const counts = await StudyCardModel.aggregate<{ _id: string; count: number }>([
        { $match: { status: "published" } },
        { $group: { _id: "$deckKey", count: { $sum: 1 } } },
      ]);
      const countsByDeckKey = new Map(counts.map((row) => [row._id, row.count]));
      const decks = await StudyDeckModel.find({ deckKey: { $in: [...countsByDeckKey.keys()] } })
        .sort({ title: 1 })
        .lean();
      const summaries: StudyDeckSummary[] = cleanMongoArray(decks).map((deck) => ({
        deck,
        publishedCardCount: countsByDeckKey.get(deck.deckKey) ?? 0,
      }));
      return { success: true, payload: summaries };
    },
  },

  getPublishedCards: {
    capability: can.studyCardStudent.read,
    handler: async (rawParams) => {
      const parsed = parseDeckKeyParams(rawParams);
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: await loadPublishedCards(parsed.params.deckKey) };
    },
  },

  getMyReviews: {
    capability: can.studyCardStudent.read,
    handler: async (rawParams) => {
      const parsed = parseDeckKeyParams(rawParams);
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      const userName = await getCurrentUserName();
      return { success: true, payload: await loadMyReviews({ userName, deckKey: parsed.params.deckKey }) };
    },
  },

  submitReview: {
    capability: can.studyCardStudent.write,
    handler: async (rawParams) => {
      const parsed = parseSubmitReviewParams(rawParams);
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      const userName = await getCurrentUserName();
      const payload = await submitReview({ userName, ...parsed.params, now: new Date() });
      return { success: true, payload };
    },
  },

  getPublishedFigure: {
    capability: can.studyCardStudent.read,
    handler: async (rawParams) => {
      const parsed = parseImageKeyParams(rawParams);
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: await loadFigure({ imageKey: parsed.params.imageKey, publishedOnly: true }) };
    },
  },
};
