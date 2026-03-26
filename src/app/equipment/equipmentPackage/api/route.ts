import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { EquipmentPackageContract } from "@/app/equipment/equipmentPackage/api/EquipmentPackageContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { EquipmentPackageModel } from "@/app/equipment/equipmentPackage/EquipmentPackageModel";
import { ProductDocPropsModel } from "@/app/realGreen/product/_lib/models/ProductDocPropsModel";
import { EquipmentPackageDoc } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";

const handlers: HandlerMap<EquipmentPackageContract> = {
  getAll: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const findResult = await EquipmentPackageModel.find().lean();
      const docs: EquipmentPackageDoc[] = cleanMongoArray(findResult);
      return { success: true, payload: docs };
    },
  },
  upsert: {
    roles: ["admin", "office"],
    handler: async ({ equipmentPackage }) => {
      await connectToMongoDB();
      const upsertResult = await EquipmentPackageModel.findOneAndUpdate(
        { packageId: equipmentPackage.packageId },
        equipmentPackage,
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(upsertResult) };
    },
  },
  deleteOne: {
    roles: ["admin", "office"],
    handler: async ({ equipmentPackage, clearReferences }) => {
      await connectToMongoDB();

      if (clearReferences) {
        await ProductDocPropsModel.updateMany(
          { equipmentPackageIds: equipmentPackage.packageId },
          { $pull: { equipmentPackageIds: equipmentPackage.packageId } },
        );
      }

      await EquipmentPackageModel.deleteOne({ packageId: equipmentPackage.packageId });
      return { success: true, payload: equipmentPackage };
    },
  },
  checkDependencies: {
    roles: ["admin", "office"],
    handler: async ({ packageId }) => {
      await connectToMongoDB();
      const products = await ProductDocPropsModel.find(
        { equipmentPackageIds: packageId },
        { productId: 1 },
      ).lean();
      const productIds = products.map((p) => p.productId);
      return { success: true, payload: { productIds } };
    },
  },
};

export const POST = createRpcHandler<EquipmentPackageContract>(handlers);
