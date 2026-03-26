import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppMethodContract } from "@/app/appMethod/api/AppMethodContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { ProductDocPropsModel } from "@/app/realGreen/product/_lib/models/ProductDocPropsModel";
import { AppMethodModel } from "@/app/appMethod/AppMethodModel";
import { AppMethodDoc } from "@/app/appMethod/AppMethodTypes";

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

      // If clearReferences is true, remove all equipmentScenarioDocs that reference this appMethod
      if (clearReferences) {
        await ProductDocPropsModel.updateMany(
          { "equipmentScenarioDocs.appMethodId": appMethod.appMethodId },
          {
            $pull: {
              equipmentScenarioDocs: { appMethodId: appMethod.appMethodId },
            },
          },
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
      const products = await ProductDocPropsModel.find(
        { "equipmentScenarioDocs.appMethodId": appMethodId },
        { productId: 1 },
      ).lean();
      const productIds = products.map((p) => p.productId);
      return { success: true, payload: { productIds } };
    },
  },
};

export const POST = createRpcHandler<AppMethodContract>(handlers);
