import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { CorruptedSyncRecordContract } from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordContract";
import { CorruptedSyncRecordModel } from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";

const handlers: HandlerMap<CorruptedSyncRecordContract> = {
  getCorruptedSyncRecords: {
    roles: ["admin"],
    handler: async (_params) => {
      // TODO: Implement query params (entityType filter, timestamp range, pagination)
      // For now, returns all records sorted by timestamp descending.
      await connectToMongoDB();
      const docs = await CorruptedSyncRecordModel.find({})
        .sort({ timestamp: -1 })
        .lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },
};

export const POST = createRpcHandler(handlers);
