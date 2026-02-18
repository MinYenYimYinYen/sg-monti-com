import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { GlobalSettingsContract } from "@/app/globalSettings/api/GlobalSettingsContract";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { GlobalSettingsModel } from "@/app/globalSettings/_lib/GlobalSettingsModel";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";

const handlers: HandlerMap<GlobalSettingsContract> = {
  updateSettings: {
    roles: ["admin"],
    handler: async (params) => {
      await connectToMongoDB();

      const existing = await GlobalSettingsModel.findOne();
      
      if (existing) {
        await GlobalSettingsModel.updateOne({}, { $set: params });
      } else {
        await GlobalSettingsModel.create({
          ...baseGlobalSettings,
          ...params
        });
      }

      return { success: true, payload: true };
    },
  },
  getSettings: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const result = await GlobalSettingsModel.findOne().lean();

      if (!result) {
        // Return defaults without writing to DB
        return { success: true, payload: baseGlobalSettings };
      }

      // Merge with baseGlobalSettings to ensure any missing fields have defaults
      return {
        success: true,
        payload: cleanMongoObject({ ...baseGlobalSettings, ...result })
      };
    },
  },
};

export const POST = createRpcHandler(handlers);
