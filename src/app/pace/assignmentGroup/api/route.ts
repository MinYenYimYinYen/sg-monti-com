import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentGroupContract } from "@/app/pace/assignmentGroup/api/AssignmentGroupContract";
import { AssignmentGroupDoc } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { AssignmentGroupModel } from "@/app/pace/assignmentGroup/AssignmentGroupModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { assignmentGroupCapabilities } from "@/app/assignmentGroup/assignmentGroupCapabilities";

// Same stored groups as the top-level assignmentGroup feature, so the same capabilities.
const { can } = assignmentGroupCapabilities;
const handlers: HandlerMap<AssignmentGroupContract> = {
  getGroups: {
    capability: can.assignmentGroups.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await AssignmentGroupModel.find({}).lean();
      return { success: true, payload: cleanMongoArray<AssignmentGroupDoc>(docs) };
    },
  },

  upsertGroup: {
    capability: can.assignmentGroups.write,
    handler: async (assignmentGroupDoc) => {
      await connectToMongoDB();
      const saved = await AssignmentGroupModel.findOneAndUpdate(
        { groupId: assignmentGroupDoc.groupId },
        { $set: assignmentGroupDoc },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<AssignmentGroupDoc>(saved!) };
    },
  },

  deleteGroup: {
    capability: can.assignmentGroups.delete,
    handler: async ({ groupId }) => {
      await connectToMongoDB();
      await AssignmentGroupModel.deleteOne({ groupId });
      return { success: true, payload: { groupId } };
    },
  },
};

export const POST = createRpcHandler<AssignmentGroupContract>(handlers);
