import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { CallLogStatusContract } from "@/app/realGreen/callLog/callLogStatus/api/CallLogStatusContract";
import { CallLogStatusModel } from "@/app/realGreen/callLog/callLogStatus/models/CallLogStatusModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<CallLogStatusContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await CallLogStatusModel.find({}).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    roles: ["admin"],
    handler: async ({ callLogStatus }) => {
      await connectToMongoDB();
      const doc = await CallLogStatusModel.findOneAndUpdate(
        { code: callLogStatus.code },
        { $set: callLogStatus },
        { upsert: true, new: true, lean: true },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { success: true, payload: cleanMongoObject(doc) as any };
    },
  },

  delete: {
    roles: ["admin"],
    handler: async ({ code }) => {
      await connectToMongoDB();
      await CallLogStatusModel.deleteOne({ code });
      return { success: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
