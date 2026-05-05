import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentPlanContract } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AssignmentPlanModel } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanModel";
import { AssignmentPlan } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<AssignmentPlanContract> = {
  getAssignmentPlans: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const result: AssignmentPlan[] = await AssignmentPlanModel.find().lean();
      const assignmentPlans = cleanMongoArray(result);
      return { success: true, payload: assignmentPlans };
    },
  },
  upsertAssignmentPlan: {
    roles: ["admin"],
    handler: async ({ employeeId, servCodeIds }) => {
      await connectToMongoDB();
      const result: AssignmentPlan = await AssignmentPlanModel.findOneAndUpdate(
        { employeeId },
        { employeeId, servCodeIds },
        { upsert: true, new: true },
      ).lean();
      const assignmentPlan: AssignmentPlan = cleanMongoObject(result);
      return { success: true, payload: assignmentPlan };
    },
  },
};

export const POST = createRpcHandler<AssignmentPlanContract>(handlers);
