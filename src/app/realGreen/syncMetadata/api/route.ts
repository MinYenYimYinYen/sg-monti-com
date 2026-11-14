import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { SyncMetadataContract } from "@/app/realGreen/syncMetadata/api/SyncMetadataContract";
import { SyncMetadataModel } from "@/app/realGreen/syncMetadata/SyncMetadataModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { can } from "@/permission/can";
const handlers: HandlerMap<SyncMetadataContract> = {
  getAll: {
    capability: can.lastSyncTimes.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await SyncMetadataModel.find({}).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },
};

export const POST = createRpcHandler(handlers);
