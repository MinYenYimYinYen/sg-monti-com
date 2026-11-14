import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { FlagRuleContract } from "@/app/flagRule/FlagRuleContract";
import { FlagRuleModel } from "@/app/flagRule/FlagRuleModel";
import { FlagRule } from "@/app/flagRule/FlagRuleTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { can } from "@/permission/can";
const handlers: HandlerMap<FlagRuleContract> = {
  getAll: {
    capability: can.flagRules.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await FlagRuleModel.find({}).lean();
      return { success: true, payload: cleanMongoArray<FlagRule>(docs) };
    },
  },
  upsert: {
    capability: can.flagRules.write,
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
    capability: can.flagRules.delete,
    handler: async ({ flagRuleId }) => {
      await connectToMongoDB();
      const deleted = await FlagRuleModel.findOneAndDelete({ flagRuleId }).lean();
      return { success: true, payload: cleanMongoObject<FlagRule>(deleted!) };
    },
  },
};

export const POST = createRpcHandler<FlagRuleContract>(handlers);
