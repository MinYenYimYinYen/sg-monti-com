import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { FlagRuleContract } from "@/app/flagRule/FlagRuleContract";
import { FlagRuleModel } from "@/app/flagRule/FlagRuleModel";
import { FlagRule } from "@/app/flagRule/FlagRuleTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<FlagRuleContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await FlagRuleModel.find({}).lean();
      return { success: true, payload: cleanMongoArray<FlagRule>(docs) };
    },
  },
  upsert: {
    roles: ["admin", "office"],
    handler: async ({ flagRule }) => {
      await connectToMongoDB();
      const saved = await FlagRuleModel.findOneAndUpdate(
        { flagRuleId: flagRule.flagRuleId },
        { $set: flagRule },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<FlagRule>(saved!) };
    },
  },
  deleteOne: {
    roles: ["admin"],
    handler: async ({ flagRuleId }) => {
      await connectToMongoDB();
      const deleted = await FlagRuleModel.findOneAndDelete({ flagRuleId }).lean();
      return { success: true, payload: cleanMongoObject<FlagRule>(deleted!) };
    },
  },
};

export const POST = createRpcHandler<FlagRuleContract>(handlers);
