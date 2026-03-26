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
      const upsertResult = await AppMethodModel.findOneAndUpdate(
        { appMethodId: appMethod.appMethodId },
        appMethod,
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: upsertResult };
    },
  },
  deleteOne: {
    roles: ["admin", "office"],
    handler: async ({ appMethod, clearReferences }) => {
      await connectToMongoDB();

      // If clearReferences is true, remove all references to this appMethod from products
      if (clearReferences) {
        await ProductDocPropsModel.updateMany(
          { 'subProductConfigDocs.appMethodId': appMethod.appMethodId },
          {
            $set: {
              'subProductConfigDocs.$[elem].useAppMethod': false,
              'subProductConfigDocs.$[elem].appMethodId': null
            }
          },
          { arrayFilters: [{ 'elem.appMethodId': appMethod.appMethodId }] }
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
        { 'subProductConfigDocs.appMethodId': appMethodId },
        { productId: 1 }
      ).lean();
      const productIds = products.map((p) => p.productId);
      return { success: true, payload: { productIds } };
    },
  },
};

export const POST = createRpcHandler<AppMethodContract>(handlers);
