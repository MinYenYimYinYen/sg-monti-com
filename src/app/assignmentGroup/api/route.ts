import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentGroupContract } from "@/app/assignmentGroup/api/AssignmentGroupContract";
import { AssignmentGroup } from "@/app/assignmentGroup/AssignmentGroupTypes";
import { AssignmentGroupModel } from "@/app/assignmentGroup/AssignmentGroupModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { assignmentGroupCapabilities } from "@/app/assignmentGroup/assignmentGroupCapabilities";

const { can } = assignmentGroupCapabilities;

const handlers: HandlerMap<AssignmentGroupContract> = {
  getGroups: {
    capability: can.assignmentGroups.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await AssignmentGroupModel.find({}).lean();
      return { success: true, payload: cleanMongoArray<AssignmentGroup>(docs) };
    },
  },

  upsertGroup: {
    capability: can.assignmentGroups.write,
    handler: async (group) => {
      await connectToMongoDB();
      const saved = await AssignmentGroupModel.findOneAndUpdate(
        { groupId: group.groupId },
        { $set: group },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<AssignmentGroup>(saved!) };
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
