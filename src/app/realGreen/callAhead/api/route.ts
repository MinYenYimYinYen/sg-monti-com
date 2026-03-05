import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { CallAheadContract } from "@/app/realGreen/callAhead/api/CallAheadContract";
import {
  extendCallAheads,
  remapCallAheads,
} from "@/app/realGreen/callAhead/_lib/callAheadServerFunc";
import { CallAheadRaw } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { CallAheadKeywordModel } from "@/app/realGreen/callAhead/models/CallAheadKeywordModel";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import { CallAheadKeyword } from "@/app/realGreen/callAhead/_lib/ext/CallAheadExtTypes";

const handlers: HandlerMap<CallAheadContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawCallAheads = await rgApi<CallAheadRaw[]>({
        path: "/CallAhead",
        method: "GET",
      });

      const callAheadCores = remapCallAheads(rawCallAheads);

      const callAheadDocs = await extendCallAheads(callAheadCores);

      return { success: true, payload: callAheadDocs };
    },
  },

  getKeywords: {
    roles: ["office", "admin"],
    handler: async () => {
      await connectToMongoDB();
      const keywordResults = await CallAheadKeywordModel.find().lean();
      const keywords: CallAheadKeyword[] = cleanMongoArray(keywordResults);
      return { success: true, payload: keywords };
    },
  },

  upsertKeyword: {
    roles: ["office", "admin"],
    handler: async ({ keyword }) => {
      await connectToMongoDB();
      const upsertResult = await CallAheadKeywordModel.findOneAndUpdate(
        { keywordId: keyword.keywordId },
        { $set: { message: keyword.message } },
        { upsert: true, new: true },
      ).lean();
      const upsertedKeyword: CallAheadKeyword = cleanMongoObject(upsertResult);
      return { success: true, payload: upsertedKeyword };
    },
  },

  deleteKeyword: {
    roles: ["office", "admin"],
    handler: async ({ keywordId }) => {
      await connectToMongoDB();
      const deleteResult = await CallAheadKeywordModel.findOneAndDelete(
        {
          keywordId,
        },
        { new: true },
      ).lean();
      const deletedKeyword: CallAheadKeyword | null = deleteResult
        ? cleanMongoObject(deleteResult)
        : null;
      if (!deletedKeyword) {
        throw new AppError({
          message: `Keyword "${keywordId}" not found.`,
          statusCode: 400,
          type: "VALIDATION_ERROR",
        });
      }
      return { success: true, payload: deletedKeyword };
    },
  },
};

export const POST = createRpcHandler(handlers);
