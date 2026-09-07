import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { PriceIncreaseSettingsContract } from "@/app/priceIncrease/settings/api/PriceIncreaseSettingsContract";
import { PriceIncreaseSettingsModel } from "@/app/priceIncrease/settings/PriceIncreaseSettingsModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<PriceIncreaseSettingsContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await PriceIncreaseSettingsModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    roles: ["admin"],
    handler: async (params) => {
      await connectToMongoDB();
      const { settingsId, ...rest } = params;
      const doc = await PriceIncreaseSettingsModel.findOneAndUpdate(
        { settingsId },
        { $set: { settingsId, ...rest } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  setActive: {
    roles: ["admin"],
    handler: async ({ settingsId }) => {
      await connectToMongoDB();
      // Deactivate all, then activate the target
      await PriceIncreaseSettingsModel.updateMany({}, { $set: { isActive: false } });
      await PriceIncreaseSettingsModel.updateOne(
        { settingsId },
        { $set: { isActive: true } },
      );
      return { success: true, payload: true };
    },
  },

  remove: {
    roles: ["admin"],
    handler: async ({ settingsId }) => {
      await connectToMongoDB();
      await PriceIncreaseSettingsModel.deleteOne({ settingsId });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
