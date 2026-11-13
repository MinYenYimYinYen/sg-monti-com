import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { CallAheadContract } from "@/app/realGreen/callAhead/api/CallAheadContract";
import {
  extendCallAheads,
  remapCallAheads,
} from "@/app/realGreen/callAhead/_lib/callAheadServerFunc";
import { CallAheadRaw } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { CallAheadKeywordModel } from "@/app/realGreen/callAhead/models/CallAheadKeywordModel";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import { CallAheadKeyword } from "@/app/realGreen/callAhead/_lib/ext/CallAheadExtTypes";
import { CallAheadDocPropsModel } from "@/app/realGreen/callAhead/models/CallAheadDocPropsModel";
import { callAheadCapabilities } from "@/app/realGreen/callAhead/callAheadCapabilities";

const { can } = callAheadCapabilities;
const handlers: HandlerMap<CallAheadContract> = {
  getAll: {
    capability: can.callAheads.read,
    handler: async () => {
      const rawCallAheads = await rgApi<CallAheadRaw[]>({
        path: "/CallAhead",
        method: "GET",
        pathTemplate: "/CallAhead",
      });

      const callAheadCores = remapCallAheads(rawCallAheads);

      const callAheadDocs = await extendCallAheads(callAheadCores);

      return { success: true, payload: callAheadDocs };
    },
  },

  upsertDocProps: {
    capability: can.callAheadDocProps.write,
    handler: async ({ docProps }) => {
      await connectToMongoDB();

      await CallAheadDocPropsModel.findOneAndUpdate(
        { callAheadId: docProps.callAheadId },
        { $set: docProps },
        { upsert: true, new: true },
      );
      return { success: true, payload: null };
    },
  },

  getKeywords: {
    capability: can.keywords.read,
    handler: async () => {
      await connectToMongoDB();
      const keywordResults = await CallAheadKeywordModel.find().lean();
      const keywords: CallAheadKeyword[] = cleanMongoArray(keywordResults);
      return { success: true, payload: keywords };
    },
  },

  upsertKeyword: {
    capability: can.keywords.write,
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
    capability: can.keywords.delete,
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

export const POST = createRealGreenRpcHandler(handlers);
