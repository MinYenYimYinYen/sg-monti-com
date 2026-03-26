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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docs = (cleanMongoArray(findResult) as any[]) as EquipmentPackageDoc[];
      return { success: true as const, payload: docs };
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
      const doc = cleanMongoObject(upsertResult) as unknown as EquipmentPackageDoc;
      return { success: true as const, payload: doc };
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
      return { success: true as const, payload: equipmentPackage };
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
      const productIds = products.map((p) => p.productId as number);
      return { success: true as const, payload: { productIds } };
    },
  },
};

export const POST = createRpcHandler<EquipmentPackageContract>(handlers);
