import type { HandlerMap } from "@/lib/api/types/rpcUtils";
import type { FormTemplateContract } from "../FormTemplateContract";
import { FormTemplateModel } from "../FormTemplateModel";
import type { FormLetterTemplateDoc } from "../FormTemplateTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<FormTemplateContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await FormTemplateModel.find({}).lean();
      return { success: true, payload: cleanMongoArray<FormLetterTemplateDoc>(docs) };
    },
  },

  upsert: {
    roles: ["admin", "office"],
    handler: async ({ template }) => {
      await connectToMongoDB();
      const saved = await FormTemplateModel.findOneAndUpdate(
        { templateId: template.templateId },
        { $set: template },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<FormLetterTemplateDoc>(saved!) };
    },
  },

  deleteOne: {
    roles: ["admin"],
    handler: async ({ templateId }) => {
      await connectToMongoDB();
      const deleted = await FormTemplateModel.findOneAndDelete({ templateId }).lean();
      return { success: true, payload: cleanMongoObject<FormLetterTemplateDoc>(deleted!) };
    },
  },
};

export const POST = createRpcHandler<FormTemplateContract>(handlers);
