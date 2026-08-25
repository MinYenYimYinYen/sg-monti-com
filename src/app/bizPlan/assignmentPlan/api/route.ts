import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentPlanContract } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { ScenarioModel } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanModel";
import { AssignmentPlan, Scenario } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

// ---------------------------------------------------------------------------
// Migration helper — transforms old-format plans (entries[]) to new format (groupIds[]).
//
// Old format: plan.entries = [{ kind: "group", groupId: "P01+R01", servCodeIds: [], ... }]
// New format: plan.groupIds = ["P01+R01", ...]
//
// Only entries with a groupId are migrated — old single entries (servCodeId only, no groupId)
// are dropped since singles no longer exist in the unified group model.
// This runs on read; the DB document is unchanged until the user saves.
// ---------------------------------------------------------------------------
function migratePlan(rawPlan: Record<string, unknown>): AssignmentPlan {
  if (Array.isArray(rawPlan.groupIds)) {
    // Already new format
    return {
      employeeId: rawPlan.employeeId as string,
      groupIds: rawPlan.groupIds as string[],
    };
  }
  // Old format: extract groupId from each entry that has one
  const entries = (rawPlan.entries as Array<Record<string, unknown>>) ?? [];
  const groupIds = entries
    .filter((e) => typeof e.groupId === "string" && e.groupId.length > 0)
    .map((e) => e.groupId as string);
  return { employeeId: rawPlan.employeeId as string, groupIds };
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
