import { InventoryContract } from "@/app/inventory/api/InventoryContract";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { InventoryCheckModel } from "@/app/inventory/InventoryCheckModel";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import { InventoryCheckDoc } from "@/app/inventory/InventoryTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { inventoryCapabilities } from "@/app/inventory/inventoryCapabilities";

const { can } = inventoryCapabilities;

const handlers: HandlerMap<InventoryContract> = {
  getInventoryChecks: {
    capability: can.inventoryChecks.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await InventoryCheckModel.find({})
        .sort({ checkDate: -1 })
        .lean();
      return {
        success: true,
        payload: cleanMongoArray<InventoryCheckDoc>(docs),
      };
    },
  },
  saveInventoryCheck: {
    capability: can.inventoryChecks.write,
    handler: async ({ check }) => {
      await connectToMongoDB();
      // Upsert — replaces the existing check for this date if one exists
      const doc = await InventoryCheckModel.findOneAndUpdate(
        { checkDate: check.checkDate },
        { $set: check },
        { upsert: true, new: true },
      ).lean();
      return {
        success: true,
        payload: cleanMongoObject<InventoryCheckDoc>(doc!),
      };
    },
  },
};

export const POST = createRpcHandler<InventoryContract>(handlers);
