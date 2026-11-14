import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { SeasonPlanContract } from "@/app/pace/seasonPlan/api/SeasonPlanContract";
import { SeasonPlanModel } from "@/app/pace/seasonPlan/api/SeasonPlanModel";
import { SeasonPlan } from "@/app/pace/seasonPlan/SeasonPlanTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { can } from "@/permission/can";
const handlers: HandlerMap<SeasonPlanContract> = {
  getSeasonPlans: {
    capability: can.seasonPlans.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await SeasonPlanModel.find().lean();
      return { success: true, payload: cleanMongoArray<SeasonPlan>(docs) };
    },
  },

  upsertSeasonPlan: {
    capability: can.seasonPlans.write,
    handler: async (seasonPlan) => {
      await connectToMongoDB();
      const result = await SeasonPlanModel.findOneAndUpdate(
        { name: seasonPlan.name },
        seasonPlan,
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<SeasonPlan>(result!) };
    },
  },

  deleteSeasonPlan: {
    capability: can.seasonPlans.delete,
    handler: async ({ name }) => {
      await connectToMongoDB();
      await SeasonPlanModel.deleteOne({ name });
      return { success: true, payload: { name } };
    },
  },

  activateSeasonPlan: {
    capability: can.seasonPlans.write,
    handler: async ({ name }) => {
      await connectToMongoDB();
      await SeasonPlanModel.updateMany({}, { isActive: false });
      await SeasonPlanModel.updateOne({ name }, { isActive: true });
      const docs = await SeasonPlanModel.find().lean();
      return { success: true, payload: cleanMongoArray<SeasonPlan>(docs) };
    },
  },
};

export const POST = createRpcHandler<SeasonPlanContract>(handlers);
