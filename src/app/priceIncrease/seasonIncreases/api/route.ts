import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { SeasonIncreasesContract } from "@/app/priceIncrease/seasonIncreases/api/SeasonIncreasesContract";
import { SeasonIncreasesModel } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { can } from "@/permission/can";

const handlers: HandlerMap<SeasonIncreasesContract> = {
  getAll: {
    capability: can.increasePlans.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await SeasonIncreasesModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    capability: can.increasePlans.write,
    handler: async (params) => {
      await connectToMongoDB();
      const { seasonIncreasesId, ...rest } = params;
      const doc = await SeasonIncreasesModel.findOneAndUpdate(
        { seasonIncreasesId },
        { $set: { seasonIncreasesId, ...rest } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  remove: {
    capability: can.increasePlans.delete,
    handler: async ({ seasonIncreasesId }) => {
      await connectToMongoDB();
      await SeasonIncreasesModel.deleteOne({ seasonIncreasesId });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
