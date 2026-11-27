import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppMethodContract } from "@/app/appMethod/api/AppMethodContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { AppMethodModel } from "@/app/appMethod/AppMethodModel";
import { AppMethodDoc } from "@/app/appMethod/AppMethodTypes";
import { can } from "@/permission/can";

const handlers: HandlerMap<AppMethodContract> = {
  getAll: {
    capability: can.appMethods.read,
    handler: async () => {
      await connectToMongoDB();
      const findResult = await AppMethodModel.find().lean();
      const docs: AppMethodDoc[] = cleanMongoArray(findResult);
      return { success: true, payload: docs };
    },
  },
  upsert: {
    capability: can.appMethods.write,
    handler: async ({ appMethod }) => {
      await connectToMongoDB();
      // Ensure new boolean fields have defaults for backward compat
      const doc: AppMethodDoc = {
        ...appMethod,
        needsWater: appMethod.needsWater ?? true,
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
    capability: can.appMethods.delete,
    handler: async ({ appMethod }) => {
      await connectToMongoDB();
      await AppMethodModel.deleteOne({
        appMethodId: appMethod.appMethodId,
      });
      return { success: true, payload: appMethod };
    },
  },
};

export const POST = createRpcHandler<AppMethodContract>(handlers);
