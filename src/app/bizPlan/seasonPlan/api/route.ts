import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { SeasonPlanContract } from "@/app/bizPlan/seasonPlan/api/SeasonPlanContract";
import { SeasonPlanModel } from "@/app/bizPlan/seasonPlan/api/SeasonPlanModel";
import { SeasonPlan } from "@/app/bizPlan/seasonPlan/SeasonPlanTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<SeasonPlanContract> = {
  getSeasonPlans: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await SeasonPlanModel.find().lean();
      return { success: true, payload: cleanMongoArray<SeasonPlan>(docs) };
    },
  },

  upsertSeasonPlan: {
    roles: ["admin", "office"],
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
    roles: ["admin"],
    handler: async ({ name }) => {
      await connectToMongoDB();
      await SeasonPlanModel.deleteOne({ name });
      return { success: true, payload: { name } };
    },
  },

  activateSeasonPlan: {
    roles: ["admin", "office"],
    handler: async ({ name }) => {
      await connectToMongoDB();
      // Deactivate all, then activate the named one atomically
      await SeasonPlanModel.updateMany({}, { isActive: false });
      await SeasonPlanModel.updateOne({ name }, { isActive: true });
      const docs = await SeasonPlanModel.find().lean();
      return { success: true, payload: cleanMongoArray<SeasonPlan>(docs) };
    },
  },
};

export const POST = createRpcHandler<SeasonPlanContract>(handlers);
