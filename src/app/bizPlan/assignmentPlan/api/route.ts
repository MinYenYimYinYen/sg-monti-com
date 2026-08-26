import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentPlanContract } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { ScenarioModel } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanModel";
import { AssignmentPlan, GroupAssignment, Scenario } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

// ---------------------------------------------------------------------------
// Migration helper — transforms old-format plans to new format.
//
// Old format (v1): plan.groupIds = ["P01+R01", ...]
// Old format (v2): plan.entries = [{ kind: "group", groupId: "P01+R01", ... }]
// New format (v3): plan.groupAssignments = [{ groupId: "P01+R01", dailyRevenueGoal: null }]
//
// This runs on read; the DB document is unchanged until the user saves.
//
// TODO: Remove migratePlan() and migrateScenario() once all documents in MongoDB
// have been updated to the new groupAssignments format. Verify with:
//   db.assignmentscenarios.find({ "plans.groupIds": { $exists: true } })
//   db.assignmentscenarios.find({ "plans.entries": { $exists: true } })
// ---------------------------------------------------------------------------
function migratePlan(rawPlan: Record<string, unknown>): AssignmentPlan {
  // Already new format
  if (Array.isArray(rawPlan.groupAssignments)) {
    return {
      employeeId: rawPlan.employeeId as string,
      groupAssignments: (rawPlan.groupAssignments as Array<Record<string, unknown>>).map(
        (ga): GroupAssignment => ({
          groupId: ga.groupId as string,
          dailyRevenueGoal: (ga.dailyRevenueGoal as number | null) ?? null,
        }),
      ),
    };
  }

  // Old format v1: groupIds[]
  if (Array.isArray(rawPlan["groupIds"])) {
    return {
      employeeId: rawPlan.employeeId as string,
      groupAssignments: (rawPlan["groupIds"] as string[]).map(
        (groupId): GroupAssignment => ({ groupId, dailyRevenueGoal: null }),
      ),
    };
  }

  // Old format v2: entries[] with groupId
  const entries = (rawPlan.entries as Array<Record<string, unknown>>) ?? [];
  const groupAssignments = entries
    .filter((e) => typeof e.groupId === "string" && e.groupId.length > 0)
    .map((e): GroupAssignment => ({ groupId: e.groupId as string, dailyRevenueGoal: null }));
  return { employeeId: rawPlan.employeeId as string, groupAssignments };
}

function migrateScenario(raw: Record<string, unknown>): Scenario {
  const rawPlans = (raw.plans as Array<Record<string, unknown>>) ?? [];
  return {
    name: raw.name as string,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
    isActive: raw.isActive as boolean,
    plans: rawPlans.map(migratePlan),
  };
}

const handlers: HandlerMap<AssignmentPlanContract> = {
  getScenarios: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const raw = await ScenarioModel.find().lean() as unknown as Record<string, unknown>[];
      const migrated: Scenario[] = cleanMongoArray(raw).map(migrateScenario);
      return { success: true, payload: migrated };
    },
  },


  upsertScenario: {
    roles: ["admin"],
    handler: async ({ name, createdAt, updatedAt, isActive, plans }) => {
      await connectToMongoDB();
      const result: Scenario = await ScenarioModel.findOneAndUpdate(
        { name },
        { name, createdAt, updatedAt, isActive, plans },
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

  activateScenario: {
    roles: ["admin"],
    handler: async ({ name }) => {
      await connectToMongoDB();
      // Deactivate all, then activate the named one atomically
      await ScenarioModel.updateMany({}, { isActive: false });
      await ScenarioModel.updateOne({ name }, { isActive: true });
      const raw = await ScenarioModel.find().lean() as unknown as Record<string, unknown>[];
      const migrated: Scenario[] = cleanMongoArray(raw).map(migrateScenario);
      return { success: true, payload: migrated };
    },
  },

};

export const POST = createRpcHandler<AssignmentPlanContract>(handlers);
