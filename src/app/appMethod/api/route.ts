import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppMethodContract } from "@/app/appMethod/api/AppMethodContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { ProductDocPropsModel } from "@/app/realGreen/product/_lib/models/ProductDocPropsModel";
import { AppMethodModel } from "@/app/appMethod/AppMethodModel";
import { EquipmentModel } from "@/app/equipment/EquipmentModel";
import { AppMethodDoc } from "@/app/appMethod/AppMethodTypes";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";

const handlers: HandlerMap<AppMethodContract> = {
  getAll: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const findResult = await AppMethodModel.find().lean();
      const docs: AppMethodDoc[] = cleanMongoArray(findResult);
      return { success: true, payload: docs };
    },
  },
  upsert: {
    roles: ["admin", "office"],
    handler: async ({ appMethod }) => {
      await connectToMongoDB();
      // Ensure new boolean fields have defaults for backward compat
      const doc: AppMethodDoc = {
        ...appMethod,
        needsWater: appMethod.needsWater ?? true,
        tracksTankLevel: appMethod.tracksTankLevel ?? true,
      };
      const upsertResult = await AppMethodModel.findOneAndUpdate(
        { appMethodId: doc.appMethodId },
        doc,
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: upsertResult };
    },
  },
  deleteOne: {
    roles: ["admin", "office"],
    handler: async ({ appMethod, clearReferences }) => {
      await connectToMongoDB();

      if (clearReferences) {
        // Remove from ProductDocProps equipment package docs
        await ProductDocPropsModel.updateMany(
          { "equipmentPackageDocs.equipmentDocs.defaultAppMethodId": appMethod.appMethodId },
          {
            $pull: {
              "equipmentPackageDocs.$[].equipmentDocs": {
                defaultAppMethodId: appMethod.appMethodId,
              },
            },
          },
        );

        // Remove from Equipment.appMethodIds (non-blocking — just clean the allowed list)
        await EquipmentModel.updateMany(
          { appMethodIds: appMethod.appMethodId },
          { $pull: { appMethodIds: appMethod.appMethodId } },
        );
        // Note: equipment where defaultAppMethodId === this should be blocked at the UI layer.
        // If somehow reached here, clear the defaultAppMethodId to empty string as a safety net.
        await EquipmentModel.updateMany(
          { defaultAppMethodId: appMethod.appMethodId },
          { $set: { defaultAppMethodId: "" } },
        );
      }

      await AppMethodModel.deleteOne({
        appMethodId: appMethod.appMethodId,
      });
      return { success: true, payload: appMethod };
    },
  },
  checkDependencies: {
    roles: ["admin", "office"],
    handler: async ({ appMethodId }) => {
      await connectToMongoDB();

      // Products whose equipment packages reference this AppMethod
      const products = await ProductDocPropsModel.find(
        { "equipmentPackageDocs.equipmentDocs.defaultAppMethodId": appMethodId },
        { productId: 1 },
      ).lean();
      const productIds = products.map((p) => p.productId);

      // Equipment where this is the default (blocking)
      const withDefaultResult = await EquipmentModel.find(
        { defaultAppMethodId: appMethodId },
      ).lean();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const equipmentWithDefault = (cleanMongoArray(withDefaultResult) as any[]) as EquipmentDoc[];

      // Equipment where this is in appMethodIds but NOT the default (non-blocking)
      const inAllowedResult = await EquipmentModel.find({
        appMethodIds: appMethodId,
        defaultAppMethodId: { $ne: appMethodId },
      }).lean();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const equipmentInAllowed = (cleanMongoArray(inAllowedResult) as any[]) as EquipmentDoc[];

      return {
        success: true as const,
        payload: { productIds, equipmentWithDefault, equipmentInAllowed },
      };
    },
  },
};

export const POST = createRpcHandler<AppMethodContract>(handlers);
