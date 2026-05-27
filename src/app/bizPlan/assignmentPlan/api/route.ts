import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentPlanContract } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AssignmentPlanModel, ScenarioModel } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanModel";
import { AssignmentPlan, Scenario } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
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
    handler: async ({ employeeId, entries }) => {
      await connectToMongoDB();
      const result: AssignmentPlan = await AssignmentPlanModel.findOneAndUpdate(
        { employeeId },
        { employeeId, entries },
        { upsert: true, new: true },
      ).lean();
      const assignmentPlan: AssignmentPlan = cleanMongoObject(result);
      return { success: true, payload: assignmentPlan };
    },
  },

  getScenarios: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const result: Scenario[] = await ScenarioModel.find().lean();
      return { success: true, payload: cleanMongoArray(result) };
    },
  },

  upsertScenario: {
    roles: ["admin"],
    handler: async ({ name, createdAt, plans }) => {
      await connectToMongoDB();
      const result: Scenario = await ScenarioModel.findOneAndUpdate(
        { name },
        { name, createdAt, plans },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(result) };
    },
  },

  deleteScenario: {
    roles: ["admin"],
    handler: async ({ name }) => {
      await connectToMongoDB();
      await ScenarioModel.deleteOne({ name });
      return { success: true, payload: { name } };
    },
  },
};

export const POST = createRpcHandler<AssignmentPlanContract>(handlers);
