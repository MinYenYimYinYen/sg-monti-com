import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { UnitConfigContract } from "./UnitConfigContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { UnitConfigModel } from "@/app/realGreen/product/_lib/models/UnitConfigModel";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import {
  ProductUnitConfig,
  ProductUnitConfigStorage,
} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import { AppError } from "@/lib/errors/AppError";

const handlers: HandlerMap<UnitConfigContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      await connectToMongoDB();


      const configDocs = await UnitConfigModel.find({}).lean();
      const configs: ProductUnitConfig[] =
        cleanMongoArray<ProductUnitConfigStorage>(configDocs);

      return {
        success: true,
        payload: { configs },
      };
    },
  },

  saveConfig: {
    roles: ["office", "admin"],
    handler: async ({ config }) => {
      await connectToMongoDB();

      // Validate that at least one conversion exists
      if (!config.conversions || Object.keys(config.conversions).length === 0) {
        throw new AppError({
          message: "Unit config must have at least one conversion",
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }

      // Upsert the configuration
       const resultDoc = await UnitConfigModel.findOneAndUpdate(
        { productId: config.productId },
        {
          productId: config.productId,
          conversions: config.conversions,
        },
        { upsert: true, new: true },
      );
      const result = cleanMongoObject<ProductUnitConfigStorage>(resultDoc);

      return {
        success: true,
        payload: { config: result },
      };
    },
  },
};

export const POST = createRpcHandler<UnitConfigContract>(handlers);
