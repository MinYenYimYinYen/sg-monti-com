import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppMethodContract } from "@/app/realGreen/product/appMethod/api/AppMethodContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppMethodModel } from "@/app/realGreen/product/appMethod/AppMethodModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { AppMethodDoc } from "@/app/realGreen/product/appMethod/AppMethodTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

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
