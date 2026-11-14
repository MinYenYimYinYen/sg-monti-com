import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { PriceIncreaseSettingsContract } from "@/app/priceIncrease/settings/api/PriceIncreaseSettingsContract";
import { PriceIncreaseSettingsModel } from "@/app/priceIncrease/settings/PriceIncreaseSettingsModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { can } from "@/permission/can";

const handlers: HandlerMap<PriceIncreaseSettingsContract> = {
  getAll: {
    capability: can.increaseSettings.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await PriceIncreaseSettingsModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    capability: can.increaseSettings.write,
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
    capability: can.increaseSettings.write,
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
    capability: can.increaseSettings.delete,
    handler: async ({ settingsId }) => {
      await connectToMongoDB();
      await PriceIncreaseSettingsModel.deleteOne({ settingsId });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
