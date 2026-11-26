import { can } from "@/permission/can";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import {
  acceptImageIdeas,
  deleteCards,
  editCard,
  loadDeckCards,
  publishCards,
  unpublishCards,
} from "@/app/study/_lib/cardActionsServer";
import { attachFigure, loadFigure, removeFigure } from "@/app/study/_lib/figureServer";
import { validationError } from "@/app/study/_lib/studyCardServer";
import type { StudyContract } from "@/app/study/api/StudyContract";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import {
  parseAttachFigureParams,
  parseCardKeyParams,
  parseCardKeysParams,
  parseDeckKeyParams,
  parseEditCardParams,
  parseImageKeyParams,
} from "@/app/study/studyRequestSchema";
import type { HandlerMap } from "@/lib/api/types/rpcUtils";

type ReviewOps = Pick<
  StudyContract,
  | "getCards"
  | "editCard"
  | "acceptImageIdeas"
  | "publishCards"
  | "unpublishCards"
  | "deleteCards"
  | "attachFigure"
  | "removeFigure"
  | "getDraftFigure"
>;

// Reviewing cards: `studyCardAdmin`. Reading is `read`, changing a card is `write`, and removing is `delete`.
export const studyReviewHandlers: HandlerMap<ReviewOps> = {
  getCards: {
    capability: can.studyCardAdmin.read,
    handler: async (rawParams) => {
      const parsed = parseDeckKeyParams(rawParams);
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: await loadDeckCards(parsed.params.deckKey) };
    },
  },

  editCard: {
    capability: can.studyCardAdmin.write,
    handler: async (rawParams) => {
      const parsed = parseEditCardParams({ raw: rawParams, config: STUDY_CONFIG });
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: await editCard(parsed.params) };
    },
  },

  acceptImageIdeas: {
    capability: can.studyCardAdmin.write,
    handler: async (rawParams) => {
      const parsed = parseCardKeysParams({ raw: rawParams, config: STUDY_CONFIG });
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: await acceptImageIdeas(parsed.params.cardKeys) };
    },
  },

  publishCards: {
    // What students see changes, so this is `write`, the administrator's permission.
    capability: can.studyCardAdmin.write,
    handler: async (rawParams) => {
      const parsed = parseCardKeysParams({ raw: rawParams, config: STUDY_CONFIG });
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: await publishCards(parsed.params.cardKeys) };
    },
  },

  unpublishCards: {
    capability: can.studyCardAdmin.write,
    handler: async (rawParams) => {
      const parsed = parseCardKeysParams({ raw: rawParams, config: STUDY_CONFIG });
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: await unpublishCards(parsed.params.cardKeys) };
    },
  },

  deleteCards: {
    capability: can.studyCardAdmin.delete,
    handler: async (rawParams) => {
      const parsed = parseCardKeysParams({ raw: rawParams, config: STUDY_CONFIG });
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: await deleteCards(parsed.params.cardKeys) };
    },
  },

  attachFigure: {
    capability: can.studyCardAdmin.write,
    handler: async (rawParams) => {
      const parsed = parseAttachFigureParams({ raw: rawParams, config: STUDY_CONFIG });
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: { card: await attachFigure(parsed.params) } };
    },
  },

  removeFigure: {
    capability: can.studyCardAdmin.write,
    handler: async (rawParams) => {
      const parsed = parseCardKeyParams(rawParams);
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: { card: await removeFigure(parsed.params.cardKey) } };
    },
  },

  getDraftFigure: {
    capability: can.studyCardAdmin.read,
    handler: async (rawParams) => {
      const parsed = parseImageKeyParams(rawParams);
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      return { success: true, payload: await loadFigure({ imageKey: parsed.params.imageKey, publishedOnly: false }) };
    },
  },
};
