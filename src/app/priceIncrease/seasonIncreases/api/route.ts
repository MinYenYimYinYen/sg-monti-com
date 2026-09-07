import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { SeasonIncreasesContract } from "@/app/priceIncrease/seasonIncreases/api/SeasonIncreasesContract";
import { SeasonIncreasesModel } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<SeasonIncreasesContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await SeasonIncreasesModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    roles: ["admin"],
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

  setActive: {
    roles: ["admin"],
    handler: async ({ seasonIncreasesId }) => {
      await connectToMongoDB();
      // Deactivate all, then activate the target
      await SeasonIncreasesModel.updateMany({}, { $set: { isActive: false } });
      await SeasonIncreasesModel.updateOne(
        { seasonIncreasesId },
        { $set: { isActive: true } },
      );
      return { success: true, payload: true };
    },
  },

  remove: {
    roles: ["admin"],
    handler: async ({ seasonIncreasesId }) => {
      await connectToMongoDB();
      await SeasonIncreasesModel.deleteOne({ seasonIncreasesId });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
