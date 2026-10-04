import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { GroupSequenceContract } from "@/app/pace/groupSequence/api/GroupSequenceContract";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";
import { GroupSequenceModel } from "@/app/pace/groupSequence/GroupSequenceModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<GroupSequenceContract> = {
  getSequences: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await GroupSequenceModel.find({}).lean();
      return { success: true, payload: cleanMongoArray<GroupSequence>(docs) };
    },
  },

  upsertSequence: {
    roles: ["admin", "office"],
    handler: async (sequence) => {
      await connectToMongoDB();
      const saved = await GroupSequenceModel.findOneAndUpdate(
        { sequenceId: sequence.sequenceId },
        { $set: sequence },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<GroupSequence>(saved!) };
    },
  },

  deleteSequence: {
    roles: ["admin", "office"],
    handler: async ({ sequenceId }) => {
      await connectToMongoDB();
      await GroupSequenceModel.deleteOne({ sequenceId });
      return { success: true, payload: { sequenceId } };
    },
  },
};

export const POST = createRpcHandler<GroupSequenceContract>(handlers);
