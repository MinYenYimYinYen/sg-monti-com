import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { GroupSequenceContract } from "@/app/pace/groupSequence/api/GroupSequenceContract";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";
import { GroupSequenceModel } from "@/app/pace/groupSequence/GroupSequenceModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { can } from "@/permission/can";
const handlers: HandlerMap<GroupSequenceContract> = {
  getSequences: {
    capability: can.groupSequences.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await GroupSequenceModel.find({}).lean();
      // Normalize daysSince: existing docs without the field return undefined from lean().
      // Coerce to 0 (no constraint) so the client always receives a number.
      const sequences = cleanMongoArray<GroupSequence>(docs).map((s) => ({
        ...s,
        daysSince: s.daysSince ?? 0,
      }));
      return { success: true, payload: sequences };
    },
  },

  upsertSequence: {
    capability: can.groupSequences.write,
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
    capability: can.groupSequences.delete,
    handler: async ({ sequenceId }) => {
      await connectToMongoDB();
      await GroupSequenceModel.deleteOne({ sequenceId });
      return { success: true, payload: { sequenceId } };
    },
  },
};

export const POST = createRpcHandler<GroupSequenceContract>(handlers);
