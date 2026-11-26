import { randomUUID } from "node:crypto";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppError } from "@/lib/errors/AppError";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { can } from "@/permission/can";
import { runGenerateCards } from "@/app/study/_lib/runGenerateCards";
import { getCurrentUserName } from "@/app/study/_lib/studyUserServer";
import { StudyDeckModel, StudyImportModel } from "@/app/study/StudyModels";
import type { StudyContract } from "@/app/study/api/StudyContract";
import { studyReviewHandlers } from "@/app/study/api/studyReviewHandlers";
import { studyStudentHandlers } from "@/app/study/api/studyStudentHandlers";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import {
  parseCreateDeckParams,
  parseDeckKeyParams,
  parseGenerateCardsParams,
  parsePlanImportParams,
} from "@/app/study/studyRequestSchema";

// Next reads this at build time, so it must be a literal. It has to exceed
// STUDY_CONFIG.generation.requestBudgetMs (280 s) with room to save the cards. The platform plan
// may cap it lower: on a plan whose limit is below the budget, lower the budget with it.
export const maxDuration = 300;

const NO_USAGE = { apiCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

type ImportOps = Pick<StudyContract, "getDecks" | "getImports" | "createDeck" | "planImport" | "generateCards">;

// Decks and imports: `studyCardAdmin`. Reviewing cards and studying are in their own files.
const importHandlers: HandlerMap<ImportOps> = {
  getDecks: {
    capability: can.studyCardAdmin.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await StudyDeckModel.find().sort({ createdAt: -1 }).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  getImports: {
    capability: can.studyCardAdmin.read,
    handler: async (rawParams) => {
      const parsed = parseDeckKeyParams(rawParams);
      if (!parsed.ok) throw validationError(parsed.message);
      await connectToMongoDB();
      const docs = await StudyImportModel.find({ deckKey: parsed.params.deckKey }).sort({ createdAt: -1 }).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  createDeck: {
    capability: can.studyCardAdmin.write,
    handler: async (rawParams) => {
      const parsed = parseCreateDeckParams({ raw: rawParams, config: STUDY_CONFIG });
      if (!parsed.ok) throw validationError(parsed.message);

      await connectToMongoDB();
      const createdByUserName = await getCurrentUserName();
      const deck = await StudyDeckModel.create({ ...parsed.params, deckKey: randomUUID(), createdByUserName });
      return { success: true, payload: cleanMongoObject(deck.toObject()) };
    },
  },

  planImport: {
    capability: can.studyCardAdmin.write,
    handler: async (rawParams) => {
      const parsed = parsePlanImportParams({ raw: rawParams, config: STUDY_CONFIG });
      if (!parsed.ok) throw validationError(parsed.message);
      const { deckKey, fileName, pageCount, chunks, skippedPages } = parsed.params;

      await connectToMongoDB();
      const deck = await StudyDeckModel.findOne({ deckKey }).lean();
      if (!deck) throw validationError("That deck does not exist.");

      const created = await StudyImportModel.create({
        importId: randomUUID(),
        deckKey,
        fileName,
        pageCount,
        skippedPages,
        model: STUDY_CONFIG.generation.model,
        importedByUserName: await getCurrentUserName(),
        chunks: chunks.map((chunk, chunkIndex) => ({
          ...chunk,
          chunkIndex,
          status: "pending",
          startedAt: null,
          failureMessage: null,
          cardCount: 0,
          proposalCount: 0,
          usage: NO_USAGE,
        })),
      });
      return { success: true, payload: cleanMongoObject(created.toObject()) };
    },
  },

  generateCards: {
    // Every call is billed to the company's Anthropic account, so this is `write`, an administrator's permission.
    capability: can.studyCardAdmin.write,
    handler: async (rawParams) => {
      const parsed = parseGenerateCardsParams({ raw: rawParams, config: STUDY_CONFIG });
      if (!parsed.ok) throw validationError(parsed.message);

      await connectToMongoDB();
      const payload = await runGenerateCards({ params: parsed.params, config: STUDY_CONFIG });
      return { success: true, payload };
    },
  },
};

const handlers: HandlerMap<StudyContract> = {
  ...importHandlers,
  ...studyReviewHandlers,
  ...studyStudentHandlers,
};

export const POST = createRpcHandler(handlers);
