import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { EquipmentContract } from "@/app/equipment/api/EquipmentContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { EquipmentModel } from "@/app/equipment/EquipmentModel";
import { EquipmentPackageModel } from "@/app/equipment/equipmentPackage/EquipmentPackageModel";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";
import { equipmentCapabilities } from "@/app/equipment/equipmentCapabilities";

const { can } = equipmentCapabilities;
const handlers: HandlerMap<EquipmentContract> = {
  getAll: {
    capability: can.equipmentDefinitions.read,
    handler: async () => {
      await connectToMongoDB();
      const findResult = await EquipmentModel.find().lean();
      const docs = cleanMongoArray(findResult) as unknown as EquipmentDoc[];
      return { success: true as const, payload: docs };
    },
  },
  upsert: {
    capability: can.equipmentDefinitions.write,
    handler: async ({ equipment }) => {
      await connectToMongoDB();
      const upsertResult = await EquipmentModel.findOneAndUpdate(
        { equipmentId: equipment.equipmentId },
        equipment,
        { upsert: true, new: true },
      ).lean();
      const doc = cleanMongoObject(upsertResult) as unknown as EquipmentDoc;
      return { success: true as const, payload: doc };
    },
  },
  deleteOne: {
    // With clearReferences this also pulls the equipment out of every package, and putting it back
    // does not restore them.
    capability: can.equipmentDefinitions.delete,
    handler: async ({ equipment, clearReferences }) => {
      await connectToMongoDB();

      if (clearReferences) {
        await EquipmentPackageModel.updateMany(
          { equipmentIds: equipment.equipmentId },
          { $pull: { equipmentIds: equipment.equipmentId } },
        );
      }

      await EquipmentModel.deleteOne({ equipmentId: equipment.equipmentId });
      return { success: true as const, payload: equipment };
    },
  },
  checkDependencies: {
    capability: can.equipmentDefinitions.delete,
    handler: async ({ equipmentId }) => {
      await connectToMongoDB();
      const packages = await EquipmentPackageModel.find(
        { equipmentIds: equipmentId },
        { packageId: 1 },
      ).lean();
      const packageIds = packages.map((p) => p.packageId as string);
      return { success: true as const, payload: { packageIds } };
    },
  },
};

export const POST = createRpcHandler<EquipmentContract>(handlers);
